
const { isAdmin, usageMessage } = require('../../funcs/commandTools')
const { StripMentions } = require('../../funcs/mentions.js')
const { AnnounceNovel, LatestChapter, Sequelize } = require("../../models")

module.exports = {
    name: ['announcechapter', 'ac'],
    description: 'Announces new chapters (admin)',
    args: "<novel> [role] [channel]",
    async execute(message, args) {
        if (!isAdmin(message)) return false
        if (args.length < 1) return usageMessage(message, this)

        let [novelStr, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)

        if (!novelStr.length)
            return message.channel.send(`Role name missing`, { code: true });

        const targetChapter = await LatestChapter.findOne({
            where: Sequelize.or(
                Sequelize.where(
                    Sequelize.fn('lower', Sequelize.col('bookName')),
                    Sequelize.fn('lower', novelStr)
                ),
                Sequelize.where(
                    Sequelize.fn('lower', Sequelize.col('bookCanonicalName')),
                    Sequelize.fn('lower', novelStr)
                )
            )
        })
        if (!targetChapter) return message.channel.send(`Novel by name or alias '${novelStr}' not found`, { code: true });
        
        await AnnounceNovel.findOrCreate({
            where: {
                bookId: targetChapter.bookId,
                server: message.guild.id,
            }, defaults: {
                channels: channelMentions.length ? channelMentions.map(cm => cm.id).join(): null,
                roles: roleMentions.length ?  roleMentions.map(rm => rm.id).join(): null,
            }
        }).then(([ac, created]) => {
            console.log(ac.channels, ac.roles)
            if (!created) return ac.destroy().then(() =>
                message.channel.send(
                    `Removing announcement from '${targetChapter.bookName}'.\nRun this command again if you wanted to edit the announcement.`, { code: true })
            )
            message.channel.send(
                `Added announcement for '${targetChapter.bookName}'.`, { code: true })
        })
    }
};