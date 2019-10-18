const Mention = {
    IsUser: (mention, guild) => {
        if (!mention) return;

        if (mention.startsWith('<@') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);

            if (mention.startsWith('!')) {
                mention = mention.slice(1);
            }

            return guild.members.get(mention)
        }
        return guild.members.get(mention)
    },
    IsChannel: (mention, guild) => {
        if (!mention) return;

        if (mention.startsWith('<#') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);

            if (mention.startsWith('!')) {
                mention = mention.slice(1);
            }

            return guild.channels.get(mention)
        }

        return guild.channels.get(mention)
    },

    IsMention: (mention, guild) => {
        let reply = Mention.IsUser(mention, guild)
        if (reply) return [reply, "discord_user"]
        reply = Mention.IsChannel(mention, guild)
        if (reply) return [reply, "discord_channel"]

        return [mention, null]

    },

    StripMentions: (guild, args) => {
        let users = []
        let channels = []
        let roles = []
        let stripped = []

        args.forEach((word, index) => {
            const arr = [
                [users, guild.members, word.match(/^<@!?(\d+)>$/)],
                [channels, guild.channels, word.match(/^<#?(\d+)>$/)],
                [roles, guild.roles, word.match(/^<@&?(\d+)>$/)],
                [stripped, null]
            ]

            for (var i in arr) {
                const [storage, objects, match] = arr[i];
                if (!objects) storage.push(word)
                else if (!match) continue
                else {
                    const found = objects.get(match[1])
                    if (found) storage.push(found)
                    break
                }
            }
        })

        return [stripped.join(" "), users, channels, roles]
    },

};

module.exports = Mention