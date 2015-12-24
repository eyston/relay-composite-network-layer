export class User {}
export class Draft {}

// const VIEWER_ID = 'me';
const VIEWER_ID = 1;

var viewer = new User();
viewer.id = VIEWER_ID;
var usersById = {
  [VIEWER_ID]: viewer
};

export function getUser(id) {
  return usersById[id];
}


var nextDraftId = 0;

var draftsById = {};
var draftIdsByUser = {
  [VIEWER_ID]: []
};

addDraft('This is a draft', false);
addDraft('This is another draft', false);

export function addDraft(text, complete) {
  var draft = new Draft();
  draft.complete = !!complete;
  draft.id = `${nextDraftId++}`;
  draft.text = text;
  draft.authorId = VIEWER_ID;
  draftsById[draft.id] = draft;
  draftIdsByUser[VIEWER_ID].push(draft.id);
  return draft.id;
}

export function getDraft(id) {
  return draftsById[id];
}

export function getDrafts() {
  return draftIdsByUser[VIEWER_ID].map(id => draftsById[id]);
}
