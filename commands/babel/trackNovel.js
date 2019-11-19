
const { isAdmin, usageMessage } = require('../../funcs/commandTools')
const { StripMentions } = require('../../funcs/mentions.js')
const { TrackNovel, Novel, Sequelize } = require("../../models")
const { novelWhere } = require("../../funcs/babelNovel/queryStrings")

module.exports = {
    name: ['tracknovel'],
    description: 'Announces new chapters for a novel (admin)',
    args: "<novel> [role] [channel]",
    async execute(message, args) {
        if (!isAdmin(message)) return false
        if (args.length < 1) return usageMessage(message, this)

        let [novelStr, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)

        if (!novelStr.length)
            return message.channel.send(`Novel name missing`, { code: true });

        const novel = await Novel.findOne({
            where: novelWhere(novelStr)
        })
        if (!novel) return message.channel.send(`Novel by name or alias '${novelStr}' not found`, { code: true });
        
        await TrackNovel.findOrCreate({
            where: {
                novel_id: novel.id,
                server: message.guild.id,
            }, defaults: {
                channels: channelMentions.length ? channelMentions.map(cm => cm.id).join(): null,
                roles: roleMentions.length ?  roleMentions.map(rm => rm.id).join(): null,
            }
        }).then(([ac, created]) => {
            if (!created) return ac.destroy().then(() =>
                message.channel.send(
                    `Removing announcement from '${novel.name}'.\nRun this command again if you wanted to edit the announcement.`, { code: true })
            )
            message.channel.send(
                `Added announcement for '${novel.name}'.`, { code: true })
        })
    }
};