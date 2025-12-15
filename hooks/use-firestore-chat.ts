import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQueryClient } from "@tanstack/react-query";

type FirestoreChatProps = {
  channelId?: string;
  conversationId?: string;
  queryKey: string;
  collectionName: "messages" | "directMessages";
};

type MessageWithMemberWithProfile = any;

export const useFirestoreChat = ({
  channelId,
  conversationId,
  queryKey,
  collectionName,
}: FirestoreChatProps) => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let unsubscribe: () => void;

    const setupListener = async () => {
      try {
        const constraints = [];

        if (channelId) {
          constraints.push(where("channelId", "==", channelId));
        } else if (conversationId) {
          constraints.push(where("conversationId", "==", conversationId));
        } else {
          return;
        }

        constraints.push(orderBy("createdAt", "desc"));
        constraints.push(firestoreLimit(50));

        const q = query(collection(db, collectionName), ...constraints);

        unsubscribe = onSnapshot(
          q,
          async (snapshot) => {
            setIsConnected(true);

            // Process changes
            for (const change of snapshot.docChanges()) {
              const messageData = {
                id: change.doc.id,
                ...change.doc.data(),
              };

              // Fetch related member and profile data
              if (messageData.memberId) {
                const memberDoc = await getDoc(
                  doc(db, "members", messageData.memberId)
                );
                if (memberDoc.exists()) {
                  messageData.member = {
                    id: memberDoc.id,
                    ...memberDoc.data(),
                  };

                  const profileDoc = await getDoc(
                    doc(db, "profiles", messageData.member.profileId)
                  );
                  if (profileDoc.exists()) {
                    messageData.member.profile = {
                      id: profileDoc.id,
                      ...profileDoc.data(),
                    };
                  }
                }
              }

              // Convert Firestore timestamps to Date objects
              if (messageData.createdAt?.toDate) {
                messageData.createdAt = messageData.createdAt.toDate();
              }
              if (messageData.updatedAt?.toDate) {
                messageData.updatedAt = messageData.updatedAt.toDate();
              }

              if (change.type === "added") {
                // Add new message
                queryClient.setQueryData([queryKey], (oldData: any) => {
                  if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                    return {
                      pages: [
                        {
                          items: [messageData],
                        },
                      ],
                      pageParams: [undefined],
                    };
                  }

                  const newData = [...oldData.pages];

                  // Check if message already exists
                  const exists = newData[0].items.some(
                    (item: any) => item.id === messageData.id
                  );

                  if (!exists) {
                    newData[0] = {
                      ...newData[0],
                      items: [messageData, ...newData[0].items],
                    };
                  }

                  return {
                    ...oldData,
                    pages: newData,
                  };
                });
              } else if (change.type === "modified") {
                // Update existing message
                queryClient.setQueryData([queryKey], (oldData: any) => {
                  if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                    return oldData;
                  }

                  const newData = oldData.pages.map((page: any) => {
                    return {
                      ...page,
                      items: page.items.map(
                        (item: MessageWithMemberWithProfile) => {
                          if (item.id === messageData.id) {
                            return messageData;
                          }
                          return item;
                        }
                      ),
                    };
                  });

                  return {
                    ...oldData,
                    pages: newData,
                  };
                });
              } else if (change.type === "removed") {
                // Remove deleted message
                queryClient.setQueryData([queryKey], (oldData: any) => {
                  if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                    return oldData;
                  }

                  const newData = oldData.pages.map((page: any) => {
                    return {
                      ...page,
                      items: page.items.filter(
                        (item: MessageWithMemberWithProfile) =>
                          item.id !== messageData.id
                      ),
                    };
                  });

                  return {
                    ...oldData,
                    pages: newData,
                  };
                });
              }
            }
          },
          (error) => {
            console.error("Firestore chat listener error:", error);
            setIsConnected(false);
          }
        );
      } catch (error) {
        console.error("Setup listener error:", error);
        setIsConnected(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [channelId, conversationId, queryKey, collectionName, queryClient]);

  return { isConnected };
};
