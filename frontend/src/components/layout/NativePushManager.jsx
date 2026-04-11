import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { getOrCreatePushDeviceId } from "../../utils/pushDeviceStorage";
import { clearStoredPushToken, getStoredPushTokenSync, persistPushToken } from "../../utils/pushTokenStorage";

export default function NativePushManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshNotifications } = useNotifications();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) {
      return undefined;
    }

    let registrationListener;
    let registrationErrorListener;
    let receivedListener;
    let actionListener;
    let appStateListener;

    async function registerNativePush() {
      try {
        if (Capacitor.getPlatform() === "android") {
          await PushNotifications.createChannel({
            id: "default",
            name: "General",
            description: "General Shopverse alerts",
            importance: 5,
            visibility: 1
          }).catch(() => {});
        }

        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") {
          return;
        }

        const deviceId = await getOrCreatePushDeviceId();

        registrationListener = await PushNotifications.addListener("registration", async ({ value }) => {
          await persistPushToken(value);
          await api.post("/notifications/device", {
            token: value,
            platform: Capacitor.getPlatform(),
            deviceId
          });
        });

        registrationErrorListener = await PushNotifications.addListener("registrationError", () => {});

        receivedListener = await PushNotifications.addListener("pushNotificationReceived", async () => {
          await refreshNotifications().catch(() => {});
        });

        actionListener = await PushNotifications.addListener("pushNotificationActionPerformed", async ({ notification }) => {
          const link = notification?.data?.link || notification?.data?.path || "";
          await refreshNotifications().catch(() => {});

          if (!link) {
            return;
          }

          if (String(link).startsWith("http")) {
            window.location.assign(link);
            return;
          }

          navigate(link);
        });

        appStateListener = await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            refreshNotifications().catch(() => {});
          }
        });

        await PushNotifications.register();
      } catch {
        // Leave push registration best-effort only until Firebase config is provided.
      }
    }

    registerNativePush().catch(() => {});

    return () => {
      registrationListener?.remove?.();
      registrationErrorListener?.remove?.();
      receivedListener?.remove?.();
      actionListener?.remove?.();
      appStateListener?.remove?.();
    };
  }, [navigate, refreshNotifications, user]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || user) {
      return undefined;
    }

    const token = getStoredPushTokenSync();

    if (!token) {
      return undefined;
    }

    clearStoredPushToken().catch(() => {});
    return undefined;
  }, [user]);

  return null;
}
