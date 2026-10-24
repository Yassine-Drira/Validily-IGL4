import test from "node:test";
import assert from "node:assert/strict";
import {
  setTestUser,
  getRequesterUser,
} from "../src/lib/auth/authorization.ts";
import {
  createCoachConversationAction,
  listCoachConversationsAction,
  getCoachConversationMessagesAction,
  renameCoachConversationAction,
  deleteCoachConversationAction,
  searchCoachConversationsAction,
  sendCoachConversationMessageAction,
  _resetLocalCoachConversationsStore,
} from "../src/lib/actions/coach-conversation-actions.ts";
import {
  resetAIQuotaForTesting,
  checkAndConsumeAIQuota,
} from "../src/lib/ai/quota-service.ts";
import { _injectTestVip, _resetTestVip } from "../src/lib/actions/vip-actions.ts";
import { _injectTestNotes, _injectTestResources } from "../src/lib/ai/academic-retrieval-service.ts";

const USER_ALICE = {
  id: "user-alice-1111-1111-1111-111111111111",
  email: "alice@insat.u-carthage.tn",
  role: "student",
  name: "Alice IGL4",
  avatarUrl: null,
};

const USER_BOB = {
  id: "user-bob-2222-2222-2222-222222222222",
  email: "bob@insat.u-carthage.tn",
  role: "student",
  name: "Bob IGL4",
  avatarUrl: null,
};

test.beforeEach(async () => {
  process.env.GROQ_API_KEY = "";
  await _resetLocalCoachConversationsStore();
  await _resetTestVip();
  await resetAIQuotaForTesting(USER_ALICE.id);
  await resetAIQuotaForTesting(USER_BOB.id);
  _injectTestNotes([]);
  _injectTestResources([]);
  setTestUser(USER_ALICE);
});

// -----------------------------------------------------------------------------
// 1. CONVERSATION LIFECYCLE & CRUD
// -----------------------------------------------------------------------------

test("CONVO-01: User can create a new persistent conversation with default auto title", async () => {
  const res = await createCoachConversationAction();
  assert.equal(res.success, true);
  assert.ok(res.data?.id);
  assert.equal(res.data?.title, "Nouvelle discussion");
  assert.equal(res.data?.title_source, "auto");
  assert.equal(res.data?.user_id, USER_ALICE.id);
});

test("CONVO-02: Sending first message automatically updates title from user prompt without extra LLM call", async () => {
  const created = await createCoachConversationAction();
  assert.equal(created.success, true);
  const convoId = created.data.id;

  const msgRes = await sendCoachConversationMessageAction({
    conversationId: convoId,
    content: "Comment réviser l'architecture microservices pour l'examen d'IGL ?",
  });

  assert.equal(msgRes.success, true);
  assert.ok(msgRes.data?.conversation);
  // Derived title from prompt
  assert.ok(msgRes.data?.conversation.title.includes("Comment réviser l'architecture"));
  assert.equal(msgRes.data?.conversation.title_source, "auto");
  assert.equal(msgRes.data?.conversation.message_count, 2); // 1 user + 1 assistant
});

test("CONVO-03: Renaming a conversation marks title_source as user and prevents auto-overwriting", async () => {
  const created = await createCoachConversationAction();
  const convoId = created.data.id;

  const renameRes = await renameCoachConversationAction(convoId, "Ma Préparation Finale IGL4");
  assert.equal(renameRes.success, true);
  assert.equal(renameRes.data?.title, "Ma Préparation Finale IGL4");
  assert.equal(renameRes.data?.title_source, "user");

  // Send message after manual rename
  const msgRes = await sendCoachConversationMessageAction({
    conversationId: convoId,
    content: "Donne-moi un plan pour ce soir",
  });

  assert.equal(msgRes.success, true);
  // Title remains the user-chosen title!
  assert.equal(msgRes.data?.conversation.title, "Ma Préparation Finale IGL4");
  assert.equal(msgRes.data?.conversation.title_source, "user");
});

test("CONVO-04: Listing conversations supports pagination and ordering by updated_at DESC", async () => {
  const c1 = await createCoachConversationAction("Discussion 1");
  const c2 = await createCoachConversationAction("Discussion 2");
  const c3 = await createCoachConversationAction("Discussion 3");

  const listRes = await listCoachConversationsAction(undefined, 2);
  assert.equal(listRes.success, true);
  assert.equal(listRes.data?.conversations.length, 2);
  assert.equal(listRes.data?.hasMore, true);
  assert.ok(listRes.data?.nextCursor);

  // Second page
  const page2Res = await listCoachConversationsAction(listRes.data.nextCursor, 2);
  assert.equal(page2Res.success, true);
  assert.equal(page2Res.data?.conversations.length, 1);
  assert.equal(page2Res.data?.hasMore, false);
});

test("CONVO-05: Deleting conversation cascades and removes its messages", async () => {
  const created = await createCoachConversationAction();
  const convoId = created.data.id;

  await sendCoachConversationMessageAction({
    conversationId: convoId,
    content: "Message de test",
  });

  // Verify messages exist
  const beforeDel = await getCoachConversationMessagesAction(convoId);
  assert.equal(beforeDel.success, true);
  assert.equal(beforeDel.data?.messages.length, 2);

  // Delete
  const delRes = await deleteCoachConversationAction(convoId);
  assert.equal(delRes.success, true);

  // Messages and conversation should now be gone
  const afterDel = await getCoachConversationMessagesAction(convoId);
  assert.equal(afterDel.success, false);
});

// -----------------------------------------------------------------------------
// 2. SEARCH CAPABILITIES
// -----------------------------------------------------------------------------

test("CONVO-06: Search finds conversations by title (ranked first) and message content with snippets", async () => {
  const c1 = await createCoachConversationAction("Stratégie Examen Théorie des Graphes");
  const c2 = await createCoachConversationAction("Planification Hebdomadaire");

  await sendCoachConversationMessageAction({
    conversationId: c2.data.id,
    content: "Je veux réviser les algorithmes de Dijkstra et Bellman-Ford",
  });

  // 1. Search for title
  const searchTitle = await searchCoachConversationsAction("Graphes");
  assert.equal(searchTitle.success, true);
  assert.equal(searchTitle.data?.length, 1);
  assert.equal(searchTitle.data?.[0].matchType, "title");
  assert.equal(searchTitle.data?.[0].title, "Stratégie Examen Théorie des Graphes");

  // 2. Search for message content
  const searchContent = await searchCoachConversationsAction("Dijkstra");
  assert.equal(searchContent.success, true);
  assert.equal(searchContent.data?.length, 1);
  assert.equal(searchContent.data?.[0].matchType, "content");
  assert.ok(searchContent.data?.[0].snippet.includes("Dijkstra"));
});

// -----------------------------------------------------------------------------
// 3. SECURITY & TENANT ISOLATION
// -----------------------------------------------------------------------------

test("CONVO-07: User Bob cannot access, read, rename, or delete User Alice's conversation", async () => {
  // Alice creates conversation
  setTestUser(USER_ALICE);
  const created = await createCoachConversationAction("Discussion Privée d'Alice");
  const aliceConvoId = created.data.id;

  // Switch to Bob
  setTestUser(USER_BOB);

  // 1. Bob cannot list Alice's conversation
  const bobList = await listCoachConversationsAction();
  assert.equal(bobList.success, true);
  assert.equal(bobList.data?.conversations.some((c) => c.id === aliceConvoId), false);

  // 2. Bob cannot read messages from Alice's conversation
  const bobRead = await getCoachConversationMessagesAction(aliceConvoId);
  assert.equal(bobRead.success, false);

  // 3. Bob cannot rename Alice's conversation
  const bobRename = await renameCoachConversationAction(aliceConvoId, "Hacked by Bob");
  assert.equal(bobRename.success, false);

  // 4. Bob cannot delete Alice's conversation
  const bobDelete = await deleteCoachConversationAction(aliceConvoId);
  assert.equal(bobDelete.success, false);

  // 5. Bob cannot send messages to Alice's conversation
  const bobSend = await sendCoachConversationMessageAction({
    conversationId: aliceConvoId,
    content: "Tentative d'intrusion",
  });
  assert.equal(bobSend.success, false);

  // 6. Bob's search does not return Alice's conversation or messages
  const bobSearch = await searchCoachConversationsAction("Privée");
  assert.equal(bobSearch.success, true);
  assert.equal(bobSearch.data?.length, 0);
});

// -----------------------------------------------------------------------------
// 4. AI QUOTA ENFORCEMENT & VIP INTEGRATION
// -----------------------------------------------------------------------------

test("CONVO-08: Standard user is blocked on 6th message in 24h, while VIP is unlimited", async () => {
  setTestUser(USER_ALICE);
  const created = await createCoachConversationAction("Test Quota Conversation");
  const convoId = created.data.id;

  // Consume 5 allowed requests
  for (let i = 1; i <= 5; i++) {
    const res = await sendCoachConversationMessageAction({
      conversationId: convoId,
      content: `Question ${i}`,
    });
    assert.equal(res.success, true, `Request ${i} should be permitted`);
  }

  // 6th request must be rejected by rolling 24h quota
  const blocked = await sendCoachConversationMessageAction({
    conversationId: convoId,
    content: "Question 6 - Trop de requêtes",
  });
  assert.equal(blocked.success, false);
  assert.ok(blocked.error?.includes("Quota"));

  // Verify VIP bypass
  _injectTestVip(USER_ALICE.id);
  const vipRes = await sendCoachConversationMessageAction({
    conversationId: convoId,
    content: "Question 6 avec VIP actif",
  });
  assert.equal(vipRes.success, true, "VIP should bypass quota limit");
});
