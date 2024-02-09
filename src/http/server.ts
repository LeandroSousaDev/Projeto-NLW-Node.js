import fastify from "fastify";
import cookie from "@fastify/cookie"
import { createPoll } from "./routes/create-poll";
import { getPoll } from "./routes/get-polls";
import { VoteOnPoll } from "./routes/vote-on-poll";

const app = fastify()

app.register(cookie, {
  secret: "poll-app-nlw",
  hook: 'onRequest',
})

app.register(createPoll)
app.register(getPoll)
app.register(VoteOnPoll)

app.listen({ port: 3333 }).then(() => {
  console.log("HTTP server running!")
})
