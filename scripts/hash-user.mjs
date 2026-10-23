import bcrypt from "bcryptjs";
const [name, password] = process.argv.slice(2);
if (!name || !password) {
  console.error("usage: npm run hash-user -- <username> <password>");
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 12);
console.log(`Vercel / plain env value:\n${name}:${hash}\n`);
console.log(`.env.local value (dollar signs escaped):\n${name}:${hash.replaceAll("$", "\\$")}`);
