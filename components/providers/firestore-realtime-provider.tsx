"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  QueryConstraint,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type FirestoreRealtimeContextType = {
  isConnected: boolean;
  subscribeToCollection: (
    collectionName: string,
    constraints: QueryConstraint[],
    callback: (data: any[]) => void
  ) => Unsubscribe;
};

const FirestoreRealtimeContext = createContext<FirestoreRealtimeContextType>({
  isConnected: false,
  subscribeToCollection: () => () => {},
});

export const useFirestoreRealtime = () => {
  return useContext(FirestoreRealtimeContext);
};

export function FirestoreRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isConnected, setIsConnected] = useState(true);

  const subscribeToCollection = (
    collectionName: string,
    constraints: QueryConstraint[],
    callback: (data: any[]) => void
  ): Unsubscribe => {
    try {
      const q = query(collection(db, collectionName), ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          callback(data);
          setIsConnected(true);
        },
        (error) => {
          console.error("Firestore realtime error:", error);
          setIsConnected(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Subscribe error:", error);
      setIsConnected(false);
      return () => {};
    }
  };

  return (
    <FirestoreRealtimeContext.Provider
      value={{ isConnected, subscribeToCollection }}
    >
      {children}
    </FirestoreRealtimeContext.Provider>
  );
}
