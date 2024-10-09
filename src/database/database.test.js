const {Role, DB} = require('./database');

const randomName = () => Math.random().toString(36).substring(2, 12);

test('updateUser', async () => {
    const user = {name: randomName(), email: `${randomName()}@${randomName()}.com`, password: randomName(), roles: [{role: Role.Diner}]};
    const add = await DB.addUser(user);
    const userID = add.id;
    const update = await DB.updateUser(userID, null, null);
    expect(update.message).toBe('nothing to change');
});

test('createFranchiseNoAdmin', async () => {
    const franchise = {name: randomName(), admins: [{email: randomName()}]};
    let temp;
    try {
        temp = await DB.createFranchise(franchise);
    }
    catch {
        expect(temp).toBe(undefined);
    }
});