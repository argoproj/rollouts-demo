# Load tester image

This directory contains the Dockerfile for `argoproj/load-tester`, which is a simple image that contains:
* [`wrk`](https://github.com/wg/wrk) - an HTTP benchmarking tool 
* `report.lua` - a custom wrk reporting script, which generates a report in json format
* [`jq`](https://github.com/stedolan/jq) - JSON processing utility to interpret the report and analyze for success or failure


## Usage

`wrk` can be invoked as follows:

```bash
# Run a benchmark for 45 seconds, using 10 threads, keeping 50 HTTP connections open, and generate a report
$ wrk -t10 -c50 -d45s -s report.lua http://canary-demo-preview/color
Running 45s test @ http://canary-demo-preview/color
  10 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    73.28ms  122.80ms   1.21s    89.58%
    Req/Sec   171.87    229.29     3.77k    92.52%
  55047 requests in 45.28s, 8.24MB read
  Non-2xx or 3xx responses: 2895
Requests/sec:   1215.71
Transfer/sec:    186.39KB
```

This generates the following `report.json`:
```json
{
  "duration_seconds":45.28,
  "requests_total":55047,
  "requests_per_second":1215.71,
  "transfer_bytes_total":8642337,
  "transfer_bytes_per_second":190865.64,
  "errors_total":2895,
  "errors_ratio":0.05,
  "latency_min_ms":0.05,
  "latency_max_ms":1206.71,
  "latency_avg_ms":73.28,
  "latency_stdev_ms":122.80
}
```

The `report.json` file can then be interpreted using `jq`:
```bash
# Ensure error rate was less than 5% and and average latency was under 100ms
$ jq -e '.errors_ratio < 0.05 and .latency_avg_ms < 100' report.json
false
```

The load-tester image can be used as part of a kubernetes job
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: load-test
spec:
  template:
    spec:
      containers:
      - name: load-tester
        image: argoproj/load-tester:latest
        command: [sh, -c, -x, -e]
        args:
        - |
          wrk -t10 -c40 -d45s -s report.lua http://canary-demo-preview/color
          jq -e '.errors_ratio <= 0.05 and .latency_avg_ms < 100' report.json
```
