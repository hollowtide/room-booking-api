const N = 10;
const URL = "http://localhost:3000/api/auth/register";
const email = `race-${Date.now()}@example.com`;

async function register(i) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "bardzo-dlugie-haslo" }),
  });
  const json = await res.json();
  return `request ${String(i).padStart(2)}: ${res.status} ${json.error ? json.error.code : `id=${json.id}`}`;
}

(async () => {
  console.log(`${N} równoległych rejestracji: ${email}`);
  const results = await Promise.all(Array.from({ length: N }, (_, i) => register(i + 1)));
  console.log(results.join("\n"));
})();
