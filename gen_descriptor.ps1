Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
cd $PSScriptRoot

if (-not (Test-Path "protos/trip.proto")) { throw "protos submodule missing. Run: git submodule update --init --recursive" }
if (-not (Test-Path "protos/google/api/annotations.proto")) { throw "google/api/* missing inside protos/" }

protoc -I protos --include_imports --descriptor_set_out=protos.pb protos/*.proto
Write-Host "✅ Generated protos.pb"
