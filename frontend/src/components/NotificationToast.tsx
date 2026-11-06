"use client";

import React from "react";
import { Bell, Webhook, CheckCircle2, AlertTriangle, ShoppingBag } from "lucide-react";

export interface PushNotification {
  id: string;
  event_type: string;
  title: string;
  message: string;
  timestamp: string;
}

interface NotificationFeedProps {
  notifications: PushNotification[];
}

export const NotificationFeed: React.FC<NotificationFeedProps> = ({ notifications }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "ADDED_TO_CART":
        return <ShoppingBag className="w-3.5 h-3.5 text-copper-500" />;
      case "DEAL_FOUND":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "SAFETY_HALT":
        return <AlertTriangle className="w-3.5 h-3.5 text-copper-400" />;
      default:
        return <Webhook className="w-3.5 h-3.5 text-sand-300" />;
    }
  };

  return (
    <div className="bg-alpine-900 border border-alpine-800 rounded-2xl p-5 shadow-2xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3.5 border-b border-alpine-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-copper-500" />
          <h3 className="font-display font-bold text-sm text-sand-100 uppercase tracking-wide">
            PUSH & WEBHOOK DISPATCH FEED
          </h3>
        </div>
        <span className="mountain-badge text-[10px] font-mono text-alpine-400 bg-alpine-850 px-2.5 py-0.5 rounded border border-alpine-800">
          {notifications.length} DISPATCHES
        </span>
      </div>

      <div className="mt-3.5 space-y-2.5 overflow-y-auto max-h-[220px]">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-alpine-400 text-xs font-mono">
            Push alerts trigger upon deal discovery & cart events.
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-alpine-950/80 border border-alpine-800 rounded-xl p-3 text-xs hover:border-alpine-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sand-200 uppercase font-display tracking-wider">
                  {getIcon(notif.event_type)}
                  <span>{notif.title}</span>
                </div>
                <span className="text-[10px] font-mono text-alpine-400">
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-[11px] text-alpine-300 mt-1 leading-relaxed">
                {notif.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
