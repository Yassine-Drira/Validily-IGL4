import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createNotification,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getActiveGlobalAnnouncements,
  resetUserAnnouncementState,
} from "../src/lib/actions/notification-actions.ts";
import { setTestUser } from "../src/lib/auth/authorization.ts";
import { sendClassmateCheer } from "../src/lib/actions/forest-actions.ts";

test("System Notifications: Component contract & AppHeader integration", () => {
  const bellPath = path.resolve("src/components/notifications/notification-bell.tsx");
  assert.ok(fs.existsSync(bellPath), "notification-bell.tsx must exist");
  const bellContent = fs.readFileSync(bellPath, "utf-8");

  assert.ok(
    bellContent.includes("NotificationBell"),
    "notification-bell.tsx must export NotificationBell component"
  );
  assert.ok(
    bellContent.includes("getMyNotifications"),
    "NotificationBell must fetch notifications"
  );
  assert.ok(
    bellContent.includes("markNotificationAsRead"),
    "NotificationBell must support marking a notification as read"
  );
  assert.ok(
    bellContent.includes("markAllNotificationsAsRead"),
    "NotificationBell must support marking all notifications as read"
  );
  assert.ok(
    bellContent.includes("deleteNotification"),
    "NotificationBell must support deleting notifications"
  );

  const headerPath = path.resolve("src/components/layout/app-header.tsx");
  const headerContent = fs.readFileSync(headerPath, "utf-8");
  assert.ok(
    headerContent.includes("<NotificationBell"),
    "AppHeader must mount NotificationBell for authenticated users"
  );
});

test("System Notifications: Lifecycle - create, fetch, mark read, delete", async () => {
  const recipientUser = {
    id: "user-notif-recipient-01",
    email: "recipient@validily.com",
    role: "student",
    name: "Yassine Drira",
    avatarUrl: null,
  };

  setTestUser(recipientUser);

  // 1. Create a notification
  const createRes = await createNotification({
    recipientId: recipientUser.id,
    senderId: "user-sender-99",
    senderName: "Amen Allah",
    type: "cheer",
    cheerType: "water",
    title: "💧 Arrosage de bosquet reçu !",
    content: "Amen vous a envoyé un arrosage bienveillant !",
    link: "/forest",
  });

  assert.equal(createRes.success, true, "createNotification must succeed");
  assert.ok(createRes.notification?.id, "Notification must have an ID");
  assert.equal(createRes.notification?.recipient_id, recipientUser.id);
  assert.equal(createRes.notification?.is_read, false);
  assert.equal(createRes.notification?.cheer_type, "water");

  const notifId = createRes.notification.id;

  // 2. Query notifications for recipient
  const myNotifs = await getMyNotifications();
  assert.ok(myNotifs.length > 0, "Recipient must have at least 1 notification");
  const found = myNotifs.find((n) => n.id === notifId);
  assert.ok(found, "Recipient's notification list must contain the created notification");
  assert.equal(found.is_read, false, "Notification must be unread initially");

  // 3. Mark single notification as read
  const markRes = await markNotificationAsRead(notifId);
  assert.equal(markRes.success, true, "markNotificationAsRead must succeed");

  const myNotifsAfterRead = await getMyNotifications();
  const foundAfterRead = myNotifsAfterRead.find((n) => n.id === notifId);
  assert.equal(foundAfterRead?.is_read, true, "Notification must now be marked as read");

  // 4. Create another unread notification and test markAllNotificationsAsRead
  await createNotification({
    recipientId: recipientUser.id,
    senderId: "user-sender-88",
    senderName: "Sarah B.",
    type: "cheer",
    cheerType: "fire",
    title: "🔥 Boost d'assiduité !",
    content: "Bravo pour votre régularité !",
    link: "/forest",
  });

  const markAllRes = await markAllNotificationsAsRead();
  assert.equal(markAllRes.success, true, "markAllNotificationsAsRead must succeed");

  const myNotifsAllRead = await getMyNotifications();
  const unreadCount = myNotifsAllRead.filter((n) => !n.is_read).length;
  assert.equal(unreadCount, 0, "All notifications must be marked as read");

  // 5. Delete notification
  const delRes = await deleteNotification(notifId);
  assert.equal(delRes.success, true, "deleteNotification must succeed");

  const myNotifsAfterDel = await getMyNotifications();
  assert.ok(!myNotifsAfterDel.some((n) => n.id === notifId), "Deleted notification must no longer be present");

  setTestUser(null);
});

test("System Notifications: sendClassmateCheer dispatches persistent notification to recipient", async () => {
  const senderUser = {
    id: "user-sender-amen-01",
    email: "amen@validily.com",
    role: "student",
    name: "Amen Allah",
    avatarUrl: null,
  };

  const recipientUser = {
    id: "user-recipient-yassine-02",
    email: "yassine@validily.com",
    role: "student",
    name: "Yassine",
    avatarUrl: null,
  };

  // Sender logs in and cheers recipient
  setTestUser(senderUser);

  const cheerRes = await sendClassmateCheer({
    recipientId: recipientUser.id,
    recipientName: recipientUser.name,
    cheerType: "water",
  });

  assert.equal(cheerRes.success, true, "sendClassmateCheer must succeed");
  assert.ok(cheerRes.message.includes("Arrosage"), "Feedback message must acknowledge cheer");

  // Recipient logs in and verifies receiving the notification
  setTestUser(recipientUser);

  const recipientNotifs = await getMyNotifications();
  const receivedCheer = recipientNotifs.find(
    (n) => n.sender_id === senderUser.id && n.cheer_type === "water"
  );

  assert.ok(receivedCheer, "Recipient must have received cheer notification from sender");
  assert.equal(receivedCheer.type, "cheer");
  assert.equal(receivedCheer.is_read, false);
  assert.ok(receivedCheer.title.includes("Arrosage"));
  assert.ok(receivedCheer.content.includes(senderUser.name));

  setTestUser(null);
});

test("Global Announcement v1.1: Registry, user isolation, and read/dismiss lifecycle", async () => {
  // 1. Check registry definition
  const announcements = await getActiveGlobalAnnouncements();
  const v1_1 = announcements.find((a) => a.id === "announcement-v1-1-release");
  assert.ok(v1_1, "v1.1 global announcement must exist in registry");
  assert.equal(v1_1.release_version, "v1.1");
  assert.equal(v1_1.is_active, true);
  assert.ok(v1_1.title.includes("v1.1"), "Title must state v1.1 release");
  assert.ok(v1_1.content.includes("Resource Sharing"), "Pillar 1 must be present");
  assert.ok(v1_1.content.includes("More Ways to Learn"), "Pillar 2 must be present");
  assert.ok(v1_1.content.includes("Voting"), "Pillar 3 must be present");
  assert.ok(v1_1.content.includes("Focus Hub"), "Pillar 4 must be present");
  assert.ok(v1_1.content.includes("Forest"), "Pillar 5 must be present");
  assert.ok(v1_1.content.includes("Performance"), "Pillar 6 must be present");

  // 2. User A logs in -> announcement is unread
  const userA = {
    id: "user-ann-test-alpha-01",
    email: "alpha@validily.com",
    role: "student",
    name: "User Alpha",
    avatarUrl: null,
  };
  await resetUserAnnouncementState(userA.id);
  setTestUser(userA);

  const notifsA = await getMyNotifications();
  const annA = notifsA.find((n) => n.id === "announcement-v1-1-release");
  assert.ok(annA, "User A must see the active broadcast announcement");
  assert.equal(annA.is_read, false, "Announcement must be unread initially for User A");

  // 3. User A marks announcement as read
  const markRes = await markNotificationAsRead("announcement-v1-1-release");
  assert.equal(markRes.success, true);

  const notifsAAfterRead = await getMyNotifications();
  const annAAfterRead = notifsAAfterRead.find((n) => n.id === "announcement-v1-1-release");
  assert.equal(annAAfterRead?.is_read, true, "User A must see the announcement marked as read");

  // 4. User B logs in -> announcement must still be UNREAD (per-user isolation!)
  const userB = {
    id: "user-ann-test-beta-02",
    email: "beta@validily.com",
    role: "student",
    name: "User Beta",
    avatarUrl: null,
  };
  await resetUserAnnouncementState(userB.id);
  setTestUser(userB);

  const notifsB = await getMyNotifications();
  const annB = notifsB.find((n) => n.id === "announcement-v1-1-release");
  assert.ok(annB, "User B must see the broadcast announcement");
  assert.equal(annB.is_read, false, "User B's announcement must be unread despite User A reading it");

  // 5. User A dismisses / deletes announcement -> disappears for User A, still present for User B
  setTestUser(userA);
  const delRes = await deleteNotification("announcement-v1-1-release");
  assert.equal(delRes.success, true);

  const notifsAAfterDel = await getMyNotifications();
  assert.ok(
    !notifsAAfterDel.some((n) => n.id === "announcement-v1-1-release"),
    "Dismissed announcement must no longer appear for User A"
  );

  setTestUser(userB);
  const notifsBCheck = await getMyNotifications();
  assert.ok(
    notifsBCheck.some((n) => n.id === "announcement-v1-1-release"),
    "Announcement must still be visible for User B"
  );

  // 6. Component contract: AnnouncementModal must exist and export component
  const modalPath = path.resolve("src/components/notifications/announcement-modal.tsx");
  assert.ok(fs.existsSync(modalPath), "announcement-modal.tsx must exist");
  const modalContent = fs.readFileSync(modalPath, "utf-8");
  assert.ok(modalContent.includes("AnnouncementModal"), "Must export AnnouncementModal");
  assert.ok(modalContent.includes("v1.1"), "Must display v1.1 badge");

  setTestUser(null);
});

