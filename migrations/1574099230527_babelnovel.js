/* eslint-disable camelcase */

exports.shorthands = undefined;
// DATABASE_URL=postgres://user:pass@localhost:5432/babelnovel-discord npm run migrate up

exports.up = pgm => {
    console.log(pgm)
    pgm.addColumns('Novels', {
        abbr: {
            type: 'string',
            unique: true
        },
        isCompleted: {
            type: 'bool',
            default: false
        },
        isHiatus: {
            type: 'bool',
            default: false
        },
        isRemoved: {
            type: 'bool',
            default: false
        },
        token: {
            type: 'string',
        },
    });

    pgm.addColumns('Chapters', {
        isAnnounced: { type: 'bool', default: true },
    });

};

exports.down = pgm => {
    /* pgm.removeColumns('novels', {
        lead: { type: 'text', notNull: true }
    }); */
};
