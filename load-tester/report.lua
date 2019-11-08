done = function(summary, latency, requests)
    fmtstring = 
[[{
  "duration_seconds":%.2f,
  "requests_total":%d,
  "requests_per_second":%.2f,
  "transfer_bytes_total":%d,
  "transfer_bytes_per_second":%.2f,
  "errors_total":%d,
  "errors_ratio":%.2f,
  "latency_min_ms":%.2f,
  "latency_max_ms":%.2f,
  "latency_avg_ms":%.2f,
  "latency_stdev_ms":%.2f
}
]]
    errors = summary.errors.connect + summary.errors.read + summary.errors.write + summary.errors.status + summary.errors.timeout
    jsonout = string.format(fmtstring,
        summary.duration/1000000,
        summary.requests,
        summary.requests/(summary.duration/1000000),
        summary.bytes,
        summary.bytes/(summary.duration/1000000),
        errors,
        errors/summary.requests,
        latency.min/1000,
        latency.max/1000,
        latency.mean/1000,
        latency.stdev/1000
    )
    io.write("\n-------------- report.json ----------------\n")
    io.write(jsonout)
    file = io.open('report.json', 'a')
    io.output(file)
    io.write(jsonout)
end
