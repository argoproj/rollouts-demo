package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"time"
	// "github.com/gorilla/handlers"
	// "github.com/gorilla/mux"
)

func main() {
	rand.Seed(time.Now().UnixNano())
	// http.Handle("/statics/", http.StripPrefix(strings.TrimRight("/statics/", "/"), http.FileServer(http.Dir("./"))))
	http.Handle("/", http.StripPrefix("/", http.FileServer(http.Dir("./"))))
	http.HandleFunc("/color", getColor)
	http.ListenAndServe(":8080", nil)
}

type request struct {
	DelayProbability *int `json:"delayPercent,omitempty"`
	DelayLength      int  `json:"delayLength,omitempty"`

	Return502Probablility *int `json:"return502,omitempty"`
	Return404Probablility *int `json:"return404,omitempty"`
}

func getColor(w http.ResponseWriter, r *http.Request) {
	requestBody, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(502)
		return
	}
	newRequest := request{}
	err = json.Unmarshal(requestBody, &newRequest)
	if err != nil {
		w.WriteHeader(502)
		return
	}
	if newRequest.DelayProbability != nil && *newRequest.DelayProbability >= rand.Intn(100) {
		time.Sleep(time.Duration(newRequest.DelayLength) * time.Second)
	}

	if newRequest.Return502Probablility != nil && *newRequest.Return502Probablility >= rand.Intn(100) {
		w.WriteHeader(502)
	} else if newRequest.Return404Probablility != nil && *newRequest.Return404Probablility >= rand.Intn(100) {
		w.WriteHeader(404)
	}

	color, _ := ioutil.ReadFile("color.json")
	fmt.Fprintf(w, "%s", string(color))
}
