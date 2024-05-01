import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjM0Y2ZhMWI3N2E1IiwibmFtZSI6Im1hdHRpYSIsImlhdCI6MTcxNDQ2NzI1MX0.m0avGCmjiizytFJnd7FkqCKNDqHjEgZQks87ntBYQfo'
)

export default client;