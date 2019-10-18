const TimeAgo = require('javascript-time-ago');
const { LatestChapter } = require("../../models");
const locale = require('javascript-time-ago/locale/en');

TimeAgo.addLocale(locale)
const timeAgo = new TimeAgo('en-US')

module.exports = {
    name: ['latestchapters', "lc"],
    description: 'Lists latest chapters',
    args: false,
    execute(message, args) {
        LatestChapter.findAll({
            order: [["id", "desc"]],
            limit: 15
        }).then(chapters => {
            let str = [`Latest chapters:`]
            if (!chapters.length)
                str.push("\tno chapters available")

            chapters.map(chapter => {
                let ago = timeAgo.format(new Date(`${chapter.publishTime}z`), "twitter")
                str.push(`${chapter.Url()} - ${ago}`)
            });
            str.push('', "Available commands:", "!requestrole <role> -- adds available role to user")
            str.push("!managerole <role> -- adds/removes role as available (admin)")
            message.channel.send(str.join("\n"), { code: false });
        })
            .catch((err) => {
                console.log(err.message)
                throw err
            })
    },
};