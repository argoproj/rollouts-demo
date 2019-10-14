package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"os"
	"time"
)

var (
	color  = os.Getenv("COLOR")
	colors = []string{
		"red",
		"orange",
		"yellow",
		"green",
		"blue",
		"purple",
	}
)

func main() {
	rand.Seed(time.Now().UnixNano())
	http.Handle("/", http.StripPrefix("/", http.FileServer(http.Dir("./"))))
	http.HandleFunc("/color", getColor)
	http.ListenAndServe(":8080", nil)
}

type colorParameters struct {
	Color            string `json:"color"`
	DelayProbability *int   `json:"delayPercent,omitempty"`
	DelayLength      int    `json:"delayLength,omitempty"`

	Return502Probablility *int `json:"return502,omitempty"`
	Return404Probablility *int `json:"return404,omitempty"`
}

func getColor(w http.ResponseWriter, r *http.Request) {
	requestBody, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(502)
		return
	}
	//The frontend has stored no values
	if string(requestBody) == `"[]"` {
		printColor(color, w)
		return
	}
	request := []colorParameters{}
	err = json.Unmarshal(requestBody, &request)
	if err != nil {
		w.WriteHeader(502)
		return

	}

	colorToReturn := randomColor()
	if color != "" {
		colorToReturn = color
	}

	var colorParams colorParameters
	for i := range request {
		cp := request[i]
		if cp.Color == colorToReturn {
			colorParams = cp
		}
	}

	if colorParams.DelayProbability != nil && *colorParams.DelayProbability >= rand.Intn(100) {
		fmt.Println("Delaying request")
		time.Sleep(time.Duration(colorParams.DelayLength) * time.Second)
	}

	if colorParams.Return502Probablility != nil && *colorParams.Return502Probablility >= rand.Intn(100) {
		fmt.Println("Returning 502")
		w.WriteHeader(502)
	} else if colorParams.Return404Probablility != nil && *colorParams.Return404Probablility >= rand.Intn(100) {
		fmt.Println("Returning 404")
		w.WriteHeader(404)
	}
	printColor(colorToReturn, w)
}

func printColor(colorToPrint string, w http.ResponseWriter) {
	switch colorToPrint {
	case "":
		randomColor := randomColor()
		fmt.Printf("Successful %s\n", randomColor)
		fmt.Fprintf(w, "\"%s\"", randomColor)
	default:
		fmt.Printf("Successful %s\n", colorToPrint)
		fmt.Fprintf(w, "\"%s\"", colorToPrint)
	}
}

func randomColor() string {
	return colors[rand.Int()%len(colors)]
}
