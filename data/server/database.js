export class User {}

let id = 1;

const usersById = {};

const addUser = (name) => {
  const user = new User();
  user.id = id++;
  user.name = name;
  user.age = 13;
  user.gender = 'male';

  usersById[user.id] = user;

  return user;
}

export const getViewer = () => {
  return viewer;
}

export const getUser = id => {
  return usersById[id];
}

const viewer = addUser('Huey');

const contactsForUser = {};
const addContact = (user, contact) => {
  contactsForUser[user.id] = (contactsForUser[user.id] || []).concat(contact.id);
}

const jason = addUser('Jason');
const nate = addUser('Nate')

addContact(viewer, jason);
addContact(viewer, nate);
addContact(viewer, addUser('Strickland'));

export class Message {}

const messagesById = {};

export const sendMessage = (author, recipient, text) => {
  const message = new Message();
  message.id = id++;
  message.text = text;
  message.authorId = author.id;
  message.receipientId = recipient.id;

  messagesById[message.id] = message;

  return message;
}

sendMessage(viewer, nate, 'Howdy, here is a message');
sendMessage(viewer, jason, 'And another message');

export const getMessage = id => {
  return messagesById[id];
}
