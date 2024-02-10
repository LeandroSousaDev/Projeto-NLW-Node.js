import { FastifyInstance } from "fastify";
import z from "zod";
import { randomUUID } from "node:crypto"
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";
import { voting } from "../utils/vote-pub-sub";


export async function VoteOnPoll(app: FastifyInstance) {
    app.post('/polls/:pollId/voltes', async (request, reply) => {
        const VoteOnPollBody = z.object({
            pollOptionId: z.string().uuid()
        })

        const VoteOnPollParams = z.object({
            pollId: z.string().uuid()
        })

        const { pollId } = VoteOnPollParams.parse(request.params)
        const { pollOptionId } = VoteOnPollBody.parse(request.body)

        let { sessionId: sessionID } = request.cookies

        if (sessionID) {
            const userVotePoll = await prisma.vote.findUnique({
                where: {
                    sessionID_pollId: {
                        sessionID,
                        pollId
                    }
                }
            })
            if (userVotePoll && userVotePoll.pollOptionId != pollOptionId) {
                await prisma.vote.delete({
                    where: {
                        id: userVotePoll.id
                    }
                })

                const votes = await redis.zincrby(pollId, -1, userVotePoll.pollOptionId)

                voting.publish(pollId, {
                    pollOptionId,
                    votes: Number(votes)
                })


            } else if (userVotePoll) {
                return reply.status(400).send({ message: "voce ja votou nesta enquete" })
            }
        }

        if (!sessionID) {
            sessionID = randomUUID()

            reply.setCookie('sessionId', sessionID, {
                path: '/',
                maxAge: 60 * 60 * 24 * 30,
                signed: true,
                httpOnly: true
            })
        }

        await prisma.vote.create({
            data: {
                sessionID,
                pollId,
                pollOptionId,
            }
        })

        const votes = await redis.zincrby(pollId, 1, pollOptionId)

        voting.publish(pollId, {
            pollOptionId,
            votes: Number(votes)
        })

        return reply.status(201).send()
    })
}