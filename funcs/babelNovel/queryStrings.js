const { Novel, Chapter, Setting, Sequelize } = require("../../models")
const { Op } = Sequelize;
const novelWhere = novelStr => {

    const rgxp = /babelnovel.com\/books\/(?<canonical>[\w-]{1,})/i
    const match = novelStr.match(rgxp)
    if (match) novelStr = match.groups.canonical

    const qr = Sequelize.or(
        { babelId: novelStr.toLowerCase() },
        { abbr: novelStr.toLowerCase() },
        { name: { [Op.iLike]: `${novelStr}%` } },
        { canonicalName: { [Op.iLike]: `${novelStr}%` } }
    )
    return qr
};

const chapterWhere = novelStr => {

    /*  const rgxp = /babelnovel.com\/books\/(?<canonical>[\w-]{1,})/i
     const match = novelStr.match(rgxp)
     if (match) novelStr = match.groups.canonical */
    const number = parseInt(novelStr) || -1
    const qr = Sequelize.or(
        { babelId: novelStr.toLowerCase() },
        { index: number },
        { num: number },
        { canonicalName: novelStr.toLowerCase() }
    )
    return qr
};

module.exports = { novelWhere, chapterWhere }

