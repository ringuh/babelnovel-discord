const { isAdmin, isBypass } = require('../funcs/commandTools')
const { StripMentions } = require('../funcs/mentions.js')
module.exports = {
    name: ['inspect'],
    description: 'Inspects role/user/channel accesses',
    args: "<role/user/channel/'server'>",
    hidden: true,
    execute(message, args) {
        if (!isAdmin(message, false)) return false

        if (args.length < 1) {
            message.channel.send(`Usage: ${this.name[0]} ${this.args}`, { code: true })
            return true
        }

        let [arg, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)
        console.log(arg, userMentions.length, channelMentions.length, roleMentions.length)
        const permissionList = [
            "ADMINISTRATOR",
            "CREATE_INSTANT_INVITE",
            "KICK_MEMBERS",
            "BAN_MEMBERS",
            "MANAGE_CHANNELS",
            "MANAGE_GUILD",
            //"ADD_REACTIONS",
            //"VIEW_AUDIT_LOG",
            "PRIORITY_SPEAKER",
            "VIEW_CHANNEL",
            "READ_MESSAGES",
            "SEND_MESSAGES",
            //"SEND_TTS_MESSAGES",
            "MANAGE_MESSAGES",
            //"EMBED_LINKS",
            //"ATTACH_FILES",
            "READ_MESSAGE_HISTORY",
            "MENTION_EVERYONE",
            /* "USE_EXTERNAL_EMOJIS",
            "EXTERNAL_EMOJIS",
            "CONNECT", */
            "SPEAK",
            "MUTE_MEMBERS",
            "DEAFEN_MEMBERS",
            "MOVE_MEMBERS",
            "MANAGE_ROLES_OR_PERMISSIONS",
            /* "USE_VAD", */
            /* "CHANGE_NICKNAME",
            "MANAGE_NICKNAMES", */
            /* "MANAGE_ROLES",
            
            "MANAGE_WEBHOOKS",
            "MANAGE_EMOJIS" */,]

        if (arg === "server") {
            let roles = guild.roles.map(role => {


                const r = {
                    name: role.name,
                    permissions: permissionList.filter(p => role.hasPermission(p)),
                    color: role.color,
                    position: role.calculatedPosition,
                    mentionable: role.mentionable,
                    managed: role.managed || role.hasPermission('ADMINISTRATOR'),
                }

                return r
            }).filter(role => !role.managed)
                .sort((a, b) => (a.position > b.position) ? 1 : -1)

            let str = [`Roles of ${guild.name}\n`]
            roles.forEach(r => {

                let rivi = [
                    `Role: ${r.name}`,
                    `permissions: ${r.permissions.join(" / ")}`,
                ]
                str.push(rivi.join("\n"))
            })

            message.channel.send(str.join("\n\n"), { code: true })
        }


        if (channelMentions[0]) {
            const channel = channelMentions[0]
            let str = [`Channel #${channel.name}`, '']

            const perms = [
                { flag: "ADMINISTRATOR", msg: "ADMIN" },
                { flag: "KICK_MEMBERS", msg: "K" },
                { flag: "BAN_MEMBERS", msg: "B" },
                { flag: "MANAGE_CHANNELS", msg: "MC" },
                { flag: "MANAGE_GUILD", msg: "MG" },
                //{ flag: "PRIORITY_SPEAKER", msg: "PRIO" },
                { flag: "VIEW_CHANNEL", msg: "S" },
                { flag: "READ_MESSAGES", msg: "R" },
                { flag: "SEND_MESSAGES", msg: "W" },
                { flag: "MANAGE_MESSAGES", msg: "EDIT" },
                { flag: "EMBED_LINKS", msg: "L" },
                { flag: "ATTACH_FILES", msg: "A" },
                { flag: "READ_MESSAGE_HISTORY", msg: "H" },
                { flag: "MENTION_EVERYONE", msg: "@" },
                { flag: "SPEAK", msg: "S" },
                { flag: "MUTE_MEMBERS", msg: "MUTE" },
                { flag: "DEAFEN_MEMBERS", msg: "DEAF" },
                { flag: "MOVE_MEMBERS", msg: "MV" },
                { flag: "MANAGE_ROLES_OR_PERMISSIONS", msg: "ROLES" },
                { flag: "MANAGE_ROLES", msg: "MR" }]

            message.guild.roles.map(r => {
                let admin = channel.permissionsFor(r).has('ADMINISTRATOR')
                let read = channel.permissionsFor(r).has('READ_MESSAGES')
                let see = channel.permissionsFor(r).has('VIEW_CHANNEL')
                return {
                    name: r.name,
                    admin: channel.permissionsFor(r).has('ADMINISTRATOR'),
                    flags: perms.map(perm => {
                        if (channel.permissionsFor(r).has(perm.flag))
                            return perm.msg
                        return null
                    }).filter(flag => flag)
                }
            }).sort((a, b) => (a.calculatedPosition > b.calculatedPosition) ? 1 : -1)
                .map(r => {
                    if (r.admin) str.push(`${r.name} ${r.flags[0]}`)
                    else str.push(`${r.name} ${r.flags.join('/')}`)
                })

            return message.channel.send(str.join("\n"), { code: true })
        }


        if (userMentions[0]) {
            const user = userMentions[0];
            const allChannels = user.guild.channels.filter(c => user.permissionsIn(c).has('VIEW_CHANNEL'))
                .sort((a, b) => (a.calculatedPosition > b.calculatedPosition) ? 1 : -1)

            const LoopChannels = (c, depth = 0) => {
                let children = allChannels.filter(c2 => c2.parentID === c.id)
                let perm = user.permissionsIn(c).has('SEND_MESSAGES') ? '' : '(read-only)'

                let tmpArr = [
                    `${depth === 0 ? '\n' : ''}` +
                    `${'\t'.repeat(depth)}` +
                    `${c.type === 'text' ? '#' : ''}${c.name}` +
                    ` ${perm}`,
                    ...children.map(c2 => LoopChannels(c2, depth + 1))]


                return tmpArr.join("\n")
            }
            let str = [`Inspecting ${user.user.username}`, '']
            str.push(`roles: ${user.roles.map(r => r.name).join(" / ")}`)

            let tmp = allChannels.filter(c => !c.parentID).map(c => LoopChannels(c))
            str.push(tmp.join("\n"))

            return message.channel.send(str.join("\n"), { code: true })
        }

        if (roleMentions[0]) {
            const role = roleMentions[0]
            if (role.hasPermission("ADMINISTRATOR"))
                return message.channel.send(`${role.name} is admin and all powerful`, { code: true })
            const allChannels = message.guild.channels.sort((a, b) => (a.calculatedPosition > b.calculatedPosition) ? 1 : -1)

            const LoopChannels = (c, depth = 0) => {
                let children = allChannels.filter(c2 => c2.parentID === c.id)
                let perm = c.permissionsFor(role).has('VIEW_CHANNEL') ?
                    (c.permissionsFor(role).has('SEND_MESSAGES') ? '' : '(read-only)') : '(BANNED)'


                let tmpArr = [
                    `${depth === 0 ? '\n' : ''}` +
                    `${'\t'.repeat(depth)}` +
                    `${c.type === 'text' ? '#' : ''}${c.name}` +
                    ` ${perm}`,
                    ...children.map(c2 => LoopChannels(c2, depth + 1))]


                return tmpArr.join("\n")
            }
            let str = [`Inspecting role ${role.name}`, '']

            let tmp = allChannels.filter(c => !c.parentID).map(c => LoopChannels(c))
            str.push(tmp.join("\n"))

            return message.channel.send(str.join("\n"), { code: true })
        }

    },
};