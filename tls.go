package main

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net"
	"os"
	"time"
)

const (
	DefaultRSABits = 2048
)

type CertOptions struct {
	// Hostnames and IPs to generate a certificate for
	Hosts []string
	// Name of organization in certificate
	Organization string
	// Creation date
	ValidFrom time.Time
	// Duration that certificate is valid for
	ValidFor time.Duration
	// whether this cert should be its own Certificate Authority
	IsCA bool
	// Size of RSA key to generate. Ignored if --ecdsa-curve is set
	RSABits int
	// ECDSA curve to use to generate a key. Valid values are P224, P256 (recommended), P384, P521
	ECDSACurve string
}

func publicKey(priv interface{}) interface{} {
	switch k := priv.(type) {
	case *rsa.PrivateKey:
		return &k.PublicKey
	case *ecdsa.PrivateKey:
		return &k.PublicKey
	default:
		return nil
	}
}

func pemBlockForKey(priv interface{}) *pem.Block {
	switch k := priv.(type) {
	case *rsa.PrivateKey:
		return &pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(k)}
	case *ecdsa.PrivateKey:
		b, err := x509.MarshalECPrivateKey(k)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Unable to marshal ECDSA private key: %v", err)
			os.Exit(2)
		}
		return &pem.Block{Type: "EC PRIVATE KEY", Bytes: b}
	default:
		return nil
	}
}

func generate(opts CertOptions) ([]byte, crypto.PrivateKey, error) {
	if len(opts.Hosts) == 0 {
		return nil, nil, fmt.Errorf("hosts not supplied")
	}

	var privateKey crypto.PrivateKey
	var err error
	switch opts.ECDSACurve {
	case "":
		rsaBits := DefaultRSABits
		if opts.RSABits != 0 {
			rsaBits = opts.RSABits
		}
		privateKey, err = rsa.GenerateKey(rand.Reader, rsaBits)
	case "P224":
		privateKey, err = ecdsa.GenerateKey(elliptic.P224(), rand.Reader)
	case "P256":
		privateKey, err = ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	case "P384":
		privateKey, err = ecdsa.GenerateKey(elliptic.P384(), rand.Reader)
	case "P521":
		privateKey, err = ecdsa.GenerateKey(elliptic.P521(), rand.Reader)
	default:
		return nil, nil, fmt.Errorf("Unrecognized elliptic curve: %q", opts.ECDSACurve)
	}
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate private key: %s", err)
	}

	var notBefore time.Time
	if opts.ValidFrom.IsZero() {
		notBefore = time.Now()
	} else {
		notBefore = opts.ValidFrom
	}
	var validFor time.Duration
	if opts.ValidFor == 0 {
		validFor = 365 * 24 * time.Hour
	}
	notAfter := notBefore.Add(validFor)

	serialNumberLimit := new(big.Int).Lsh(big.NewInt(1), 128)
	serialNumber, err := rand.Int(rand.Reader, serialNumberLimit)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate serial number: %s", err)
	}

	if opts.Organization == "" {
		return nil, nil, fmt.Errorf("organization not supplied")
	}
	template := x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			Organization: []string{opts.Organization},
		},
		NotBefore: notBefore,
		NotAfter:  notAfter,

		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}

	for _, h := range opts.Hosts {
		if ip := net.ParseIP(h); ip != nil {
			template.IPAddresses = append(template.IPAddresses, ip)
		} else {
			template.DNSNames = append(template.DNSNames, h)
		}
	}

	if opts.IsCA {
		template.IsCA = true
		template.KeyUsage |= x509.KeyUsageCertSign
	}

	certBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, publicKey(privateKey), privateKey)
	if err != nil {
		return nil, nil, fmt.Errorf("Failed to create certificate: %s", err)
	}
	return certBytes, privateKey, nil
}

// generatePEM generates a new certificate and key and returns it as PEM encoded bytes
func generatePEM(opts CertOptions) ([]byte, []byte, error) {
	certBytes, privateKey, err := generate(opts)
	if err != nil {
		return nil, nil, err
	}
	certpem := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certBytes})
	keypem := pem.EncodeToMemory(pemBlockForKey(privateKey))
	return certpem, keypem, nil
}

// GenerateX509KeyPair generates a X509 key pair
func GenerateX509KeyPair(opts CertOptions) (*tls.Certificate, error) {
	certpem, keypem, err := generatePEM(opts)
	if err != nil {
		return nil, err
	}
	cert, err := tls.X509KeyPair(certpem, keypem)
	if err != nil {
		return nil, err
	}
	return &cert, nil
}

// CreateServerTLSConfig will provide a TLS configuration for a server. It will
// either use a certificate and key provided at tlsCertPath and tlsKeyPath, or
// if these are not given, will generate a self-signed certificate valid for
// the specified list of hosts. If hosts is nil or empty, self-signed cert
// creation will be disabled.
func CreateServerTLSConfig(tlsCertPath, tlsKeyPath string, hosts []string) (*tls.Config, error) {
	var cert *tls.Certificate
	var err error

	tlsCertExists := false
	tlsKeyExists := false

	// If cert and key paths were specified, ensure they exist
	if tlsCertPath != "" && tlsKeyPath != "" {
		_, err = os.Stat(tlsCertPath)
		if err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				log.Printf("could not read TLS cert from %s: %v", tlsCertPath, err)
			}
		} else {
			tlsCertExists = true
		}

		_, err = os.Stat(tlsKeyPath)
		if err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				log.Printf("could not read TLS cert from %s: %v", tlsKeyPath, err)
			}
		} else {
			tlsKeyExists = true
		}
	}

	if !tlsCertExists || !tlsKeyExists {
		log.Printf("Generating self-signed gRPC TLS certificate for this session")
		c, err := GenerateX509KeyPair(CertOptions{
			Hosts:        hosts,
			Organization: "Argo Rollouts Demo",
			IsCA:         true,
		})
		if err != nil {
			return nil, err
		}
		cert = c
	} else {
		log.Printf("Loading gRPC TLS configuration from cert=%s and key=%s", tlsCertPath, tlsKeyPath)
		c, err := tls.LoadX509KeyPair(tlsCertPath, tlsKeyPath)
		if err != nil {
			return nil, fmt.Errorf("Unable to initalize gRPC TLS configuration with cert=%s and key=%s: %v", tlsCertPath, tlsKeyPath, err)
		}
		cert = &c
	}

	return &tls.Config{Certificates: []tls.Certificate{*cert}}, nil

}
