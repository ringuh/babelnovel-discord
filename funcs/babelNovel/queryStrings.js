const { Novel, Chapter, Setting, Sequelize } = require("../../models")
const { Op } = Sequelize;
const novelWhere = novelStr => {
    const qr = Sequelize.or(
        { babelId: novelStr.toLowerCase() },
        { abbr: novelStr.toLowerCase() },
        { name: { [Op.iLike]: `${novelStr}%` } },
        { canonicalName: { [Op.iLike]: `${novelStr}%` } }
    )
    return qr
};


module.exports = { novelWhere }

