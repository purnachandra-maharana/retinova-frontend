const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

const app = require("../server");

function request(server, path) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const request = http.request(
      {
        hostname: address.address,
        port: address.port,
        path,
        method: "GET",
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: JSON.parse(body),
          });
        });
      }
    );
    request.on("error", reject);
    request.end();
  });
}

test("health endpoint reports a healthy API", async (t) => {
  const server = http.createServer(app);
  t.after(() => server.close());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const response = await request(server, "/api/health");

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.status, "healthy");
});

test("unknown routes return a JSON 404", async (t) => {
  const server = http.createServer(app);
  t.after(() => server.close());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const response = await request(server, "/api/does-not-exist");

  assert.equal(response.statusCode, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "API endpoint not found");
});

test("clinical APIs reject anonymous requests", async (t) => {
  const server = http.createServer(app);
  t.after(() => server.close());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const response = await request(server, "/api/patients");

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.message, "Authentication required");
});
