
const { isAdmin, usageMessage } = require('../funcs/commandTools')

module.exports = {
    name: ['clear', 'clearcomments'],
    description: 'Clears comments (admin)',
    args: "[comment_id] [+-count]",
    permissions: ["MANAGE_MESSAGES"],
    async execute(message, args, parameters) {
        if (!isAdmin(message, false)) return false

        if (args.length < 1) return usageMessage(message, this)
        const msg_id = args[0].length > 10 ? args[0] : null
        const last = args[args.length - 1]
        let query = {
            limit: 100
        }
        if (Math.abs(parseInt(last)) < 101) {
            query.limit = Math.abs(parseInt(last))
            if (msg_id && last.startsWith('-'))
                query.after = msg_id
            else if (msg_id)
                query.before = msg_id
        }
        else query.limit = 0

        await message.delete()

        let tbc = true
        if (msg_id)
            tbc = await message.channel.fetchMessage(msg_id).then(async msg => {
                if (!msg) return null
                return await msg.delete().catch(err => null)
            }).catch(err => console.log(err.message))

        if (tbc && query.limit)
            await message.channel.fetchMessages(query).then(async messages => {
                const deleted = await message.channel.bulkDelete(messages, true)

                messages.filter(msg => !deleted.some(del => del.id === msg.id))
                    .forEach(async msg => await msg.delete(1000).catch(err => console.log(err)))
            }).catch(err => console.log(err.message))
    }
};



