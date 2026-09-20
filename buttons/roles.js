const config = require('../config/config');
const s = require('../services/selfRoles');
module.exports = {
    customId: 'roles',
    async execute(_client, i) {
        return s.guarded(i, async () => {
            if (s.store.message(i.guildId, i.message.id)) s.fail('Dit standaardpaneel is vervangen. Gebruik de nieuwe knoppen.');
            const roleId = config.SelfRoles?.[i.customId.split(':')[1]];
            if (!roleId) s.fail('Deze oude zelfrol is niet ingesteld. Laat een beheerder dit bericht vervangen via /selfrollen plaatsen.');
            return s.toggle(i,roleId,'Oud standaardpaneel');
        });
    }
};
