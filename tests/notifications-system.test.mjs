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
