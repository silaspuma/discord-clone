import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  DocumentData,
  addDoc,
  Timestamp,
  WhereFilterOp,
} from "firebase/firestore";
import { db } from "./firebase";

// Type definitions for models
export enum MemberRole {
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
  GUEST = "GUEST",
}

export enum ChannelType {
  TEXT = "TEXT",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Server {
  id: string;
  name: string;
  imageUrl: string;
  inviteCode: string;
  profileId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: string;
  role: MemberRole;
  profileId: string;
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  profileId: string;
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  content: string;
  fileUrl?: string;
  memberId: string;
  channelId: string;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DirectMessage {
  id: string;
  content: string;
  fileUrl?: string;
  memberId: string;
  conversationId: string;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  memberOneId: string;
  memberTwoId: string;
}

// Helper function to convert Firestore timestamps to Date objects
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  if (converted.createdAt && converted.createdAt.toDate) {
    converted.createdAt = converted.createdAt.toDate();
  }
  if (converted.updatedAt && converted.updatedAt.toDate) {
    converted.updatedAt = converted.updatedAt.toDate();
  }
  return converted;
};

// Generic CRUD operations
export const firestoreDb = {
  profile: {
    async findUnique(where: { userId?: string; id?: string }) {
      try {
        if (where.id) {
          const docRef = doc(db, "profiles", where.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Profile;
          }
          return null;
        }
        
        if (where.userId) {
          const q = query(
            collection(db, "profiles"),
            where("userId", "==", where.userId),
            limit(1)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return convertTimestamps({ id: doc.id, ...doc.data() }) as Profile;
          }
        }
        return null;
      } catch (error) {
        console.error("Error finding profile:", error);
        return null;
      }
    },

    async create(data: {
      data: Omit<Profile, "id" | "createdAt" | "updatedAt">;
    }) {
      try {
        const now = Timestamp.now();
        const docRef = await addDoc(collection(db, "profiles"), {
          ...data.data,
          createdAt: now,
          updatedAt: now,
        });
        const docSnap = await getDoc(docRef);
        return convertTimestamps({ id: docRef.id, ...docSnap.data() }) as Profile;
      } catch (error) {
        console.error("Error creating profile:", error);
        throw error;
      }
    },

    async update(params: {
      where: { id: string };
      data: Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>;
    }) {
      try {
        const docRef = doc(db, "profiles", params.where.id);
        await updateDoc(docRef, {
          ...params.data,
          updatedAt: Timestamp.now(),
        });
        const docSnap = await getDoc(docRef);
        return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Profile;
      } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
      }
    },
  },

  server: {
    async findFirst(params: any) {
      try {
        const constraints: QueryConstraint[] = [];
        
        if (params.where.id) {
          const docRef = doc(db, "servers", params.where.id);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) return null;
          
          const serverData = convertTimestamps({ id: docSnap.id, ...docSnap.data() });
          
          // Handle includes
          if (params.include?.members) {
            const q = query(
              collection(db, "members"),
              where("serverId", "==", params.where.id)
            );
            const membersSnap = await getDocs(q);
            serverData.members = membersSnap.docs.map(doc => 
              convertTimestamps({ id: doc.id, ...doc.data() })
            );
          }
          
          if (params.include?.channels) {
            const channelConstraints: QueryConstraint[] = [
              where("serverId", "==", params.where.id)
            ];
            
            if (params.include.channels.where?.name) {
              channelConstraints.push(where("name", "==", params.include.channels.where.name));
            }
            
            if (params.include.channels.orderBy) {
              const field = Object.keys(params.include.channels.orderBy)[0];
              const direction = params.include.channels.orderBy[field];
              channelConstraints.push(orderBy(field, direction));
            }
            
            const q = query(collection(db, "channels"), ...channelConstraints);
            const channelsSnap = await getDocs(q);
            serverData.channels = channelsSnap.docs.map(doc => 
              convertTimestamps({ id: doc.id, ...doc.data() })
            );
          }
          
          return serverData;
        }

        if (params.where.inviteCode) {
          constraints.push(where("inviteCode", "==", params.where.inviteCode));
        }

        if (params.where.profileId) {
          constraints.push(where("profileId", "==", params.where.profileId));
        }

        const q = query(collection(db, "servers"), ...constraints, limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const serverDoc = querySnapshot.docs[0];
          const serverData = convertTimestamps({ id: serverDoc.id, ...serverDoc.data() });
          
          // Handle nested where clause for members
          if (params.where.members?.some) {
            const membersQuery = query(
              collection(db, "members"),
              where("serverId", "==", serverDoc.id)
            );
            const membersSnap = await getDocs(membersQuery);
            const members = membersSnap.docs.map(doc => 
              convertTimestamps({ id: doc.id, ...doc.data() })
            );
            
            // Check if any member matches the criteria
            const hasMatchingMember = members.some((member: any) => {
              if (params.where.members.some.profileId) {
                return member.profileId === params.where.members.some.profileId;
              }
              return false;
            });
            
            if (!hasMatchingMember) {
              return null;
            }
          }
          
          return serverData;
        }
        return null;
      } catch (error) {
        console.error("Error finding server:", error);
        return null;
      }
    },

    async findMany(params?: any) {
      try {
        const constraints: QueryConstraint[] = [];
        
        if (params?.where?.profileId) {
          constraints.push(where("profileId", "==", params.where.profileId));
        }

        const q = query(collection(db, "servers"), ...constraints);
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => 
          convertTimestamps({ id: doc.id, ...doc.data() })
        );
      } catch (error) {
        console.error("Error finding servers:", error);
        return [];
      }
    },

    async findUnique(params: any) {
      // findUnique is essentially the same as findFirst for Firestore
      // but with the expectation of finding exactly one result
      return this.findFirst(params);
    },

    async create(params: { data: any }) {
      try {
        const now = Timestamp.now();
        const serverData = {
          name: params.data.name,
          imageUrl: params.data.imageUrl,
          inviteCode: params.data.inviteCode,
          profileId: params.data.profileId,
          createdAt: now,
          updatedAt: now,
        };
        
        const docRef = await addDoc(collection(db, "servers"), serverData);
        const serverId = docRef.id;
        
        // Handle nested creates (channels and members)
        if (params.data.channels?.create) {
          for (const channelData of params.data.channels.create) {
            await addDoc(collection(db, "channels"), {
              ...channelData,
              serverId,
              type: ChannelType.TEXT,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        
        if (params.data.members?.create) {
          for (const memberData of params.data.members.create) {
            await addDoc(collection(db, "members"), {
              ...memberData,
              serverId,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        
        const docSnap = await getDoc(docRef);
        return convertTimestamps({ id: serverId, ...docSnap.data() });
      } catch (error) {
        console.error("Error creating server:", error);
        throw error;
      }
    },

    async update(params: {
      where: { id: string };
      data: any;
    }) {
      try {
        const now = Timestamp.now();
        const { members, channels, ...updateData } = params.data;
        
        // Update server document if there are direct fields to update
        if (Object.keys(updateData).length > 0) {
          const docRef = doc(db, "servers", params.where.id);
          await updateDoc(docRef, {
            ...updateData,
            updatedAt: now,
          });
        }
        
        // Handle nested member creation
        if (members?.create) {
          for (const memberData of members.create) {
            await addDoc(collection(db, "members"), {
              ...memberData,
              serverId: params.where.id,
              role: memberData.role || MemberRole.GUEST,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        
        // Handle nested channel creation
        if (channels?.create) {
          for (const channelData of channels.create) {
            await addDoc(collection(db, "channels"), {
              ...channelData,
              serverId: params.where.id,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        
        const docRef = doc(db, "servers", params.where.id);
        const docSnap = await getDoc(docRef);
        return convertTimestamps({ id: docSnap.id, ...docSnap.data() });
      } catch (error) {
        console.error("Error updating server:", error);
        throw error;
      }
    },

    async delete(params: { where: { id: string } }) {
      try {
        const docRef = doc(db, "servers", params.where.id);
        await deleteDoc(docRef);
        
        // Delete associated data
        const membersQuery = query(
          collection(db, "members"),
          where("serverId", "==", params.where.id)
        );
        const membersSnap = await getDocs(membersQuery);
        for (const memberDoc of membersSnap.docs) {
          await deleteDoc(memberDoc.ref);
        }
        
        const channelsQuery = query(
          collection(db, "channels"),
          where("serverId", "==", params.where.id)
        );
        const channelsSnap = await getDocs(channelsQuery);
        for (const channelDoc of channelsSnap.docs) {
          await deleteDoc(channelDoc.ref);
        }
        
        return { id: params.where.id };
      } catch (error) {
        console.error("Error deleting server:", error);
        throw error;
      }
    },
  },

  member: {
    async findFirst(params: any) {
      try {
        const constraints: QueryConstraint[] = [];
        
        if (params.where.id) {
          const docRef = doc(db, "members", params.where.id);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) return null;
          return convertTimestamps({ id: docSnap.id, ...docSnap.data() });
        }

        if (params.where.serverId) {
          constraints.push(where("serverId", "==", params.where.serverId));
        }
        if (params.where.profileId) {
          constraints.push(where("profileId", "==", params.where.profileId));
        }

        const q = query(collection(db, "members"), ...constraints, limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          return convertTimestamps({ id: doc.id, ...doc.data() });
        }
        return null;
      } catch (error) {
        console.error("Error finding member:", error);
        return null;
      }
    },

    async update(params: {
      where: { id: string };
      data: any;
    }) {
      try {
        const docRef = doc(db, "members", params.where.id);
        await updateDoc(docRef, {
          ...params.data,
          updatedAt: Timestamp.now(),
        });
        const docSnap = await getDoc(docRef);
        return convertTimestamps({ id: docSnap.id, ...docSnap.data() });
      } catch (error) {
        console.error("Error updating member:", error);
        throw error;
      }
    },

    async delete(params: { where: { id: string } }) {
      try {
        const docRef = doc(db, "members", params.where.id);
        await deleteDoc(docRef);
        return { id: params.where.id };
      } catch (error) {
        console.error("Error deleting member:", error);
        throw error;
      }
    },
  },

  channel: {
    async findFirst(params: any) {
      try {
        const constraints: QueryConstraint[] = [];
        
        if (params.where.id) {
          const docRef = doc(db, "channels", params.where.id);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) return null;
          return convertTimestamps({ id: docSnap.id, ...docSnap.data() });
        }

        if (params.where.serverId) {
          constraints.push(where("serverId", "==", params.where.serverId));
        }
        if (params.where.name) {
          constraints.push(where("name", "==", params.where.name));
        }

        const q = query(collection(db, "channels"), ...constraints, limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          return convertTimestamps({ id: doc.id, ...doc.data() });
        }
        return null;
      } catch (error) {
        console.error("Error finding channel:", error);
        return null;
      }
    },

    async create(params: { data: any }) {
      try {
        const now = Timestamp.now();
        const docRef = await addDoc(collection(db, "channels"), {
          ...params.data,
          createdAt: now,
          updatedAt: now,
        });
        const docSnap = await getDoc(docRef);
        return convertTimestamps({ id: docRef.id, ...docSnap.data() });
      } catch (error) {
        console.error("Error creating channel:", error);
        throw error;
      }
    },

    async update(params: {
      where: { id: string };
      data: any;
    }) {
      try {
        const docRef = doc(db, "channels", params.where.id);
        await updateDoc(docRef, {
          ...params.data,
          updatedAt: Timestamp.now(),
        });
        const docSnap = await getDoc(docRef);
        return convertTimestamps({ id: docSnap.id, ...docSnap.data() });
      } catch (error) {
        console.error("Error updating channel:", error);
        throw error;
      }
    },

    async delete(params: { where: { id: string } }) {
      try {
        const docRef = doc(db, "channels", params.where.id);
        await deleteDoc(docRef);
        return { id: params.where.id };
      } catch (error) {
        console.error("Error deleting channel:", error);
        throw error;
      }
    },
  },

  message: {
    async create(params: { data: any; include?: any }) {
      try {
        const now = Timestamp.now();
        const docRef = await addDoc(collection(db, "messages"), {
          ...params.data,
          deleted: false,
          createdAt: now,
          updatedAt: now,
        });
        
        const docSnap = await getDoc(docRef);
        const messageData = convertTimestamps({ id: docRef.id, ...docSnap.data() });
        
        // Handle includes
        if (params.include?.member) {
          const memberRef = doc(db, "members", params.data.memberId);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            messageData.member = convertTimestamps({ id: memberSnap.id, ...memberSnap.data() });
            
            if (params.include.member.include?.profile) {
              const profileRef = doc(db, "profiles", messageData.member.profileId);
              const profileSnap = await getDoc(profileRef);
              if (profileSnap.exists()) {
                messageData.member.profile = convertTimestamps({ 
                  id: profileSnap.id, 
                  ...profileSnap.data() 
                });
              }
            }
          }
        }
        
        return messageData;
      } catch (error) {
        console.error("Error creating message:", error);
        throw error;
      }
    },

    async update(params: {
      where: { id: string };
      data: any;
      include?: any;
    }) {
      try {
        const docRef = doc(db, "messages", params.where.id);
        await updateDoc(docRef, {
          ...params.data,
          updatedAt: Timestamp.now(),
        });
        
        const docSnap = await getDoc(docRef);
        const messageData = convertTimestamps({ id: docSnap.id, ...docSnap.data() });
        
        // Handle includes
        if (params.include?.member) {
          const memberRef = doc(db, "members", messageData.memberId);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            messageData.member = convertTimestamps({ id: memberSnap.id, ...memberSnap.data() });
            
            if (params.include.member.include?.profile) {
              const profileRef = doc(db, "profiles", messageData.member.profileId);
              const profileSnap = await getDoc(profileRef);
              if (profileSnap.exists()) {
                messageData.member.profile = convertTimestamps({ 
                  id: profileSnap.id, 
                  ...profileSnap.data() 
                });
              }
            }
          }
        }
        
        return messageData;
      } catch (error) {
        console.error("Error updating message:", error);
        throw error;
      }
    },

    async delete(params: { where: { id: string } }) {
      try {
        const docRef = doc(db, "messages", params.where.id);
        await deleteDoc(docRef);
        return { id: params.where.id };
      } catch (error) {
        console.error("Error deleting message:", error);
        throw error;
      }
    },

    async findMany(params: any) {
      try {
        const constraints: QueryConstraint[] = [];
        
        if (params.where?.channelId) {
          constraints.push(where("channelId", "==", params.where.channelId));
        }
        
        if (params.orderBy) {
          const field = Object.keys(params.orderBy)[0];
          const direction = params.orderBy[field];
          constraints.push(orderBy(field, direction));
        }
        
        if (params.take) {
          constraints.push(limit(params.take));
        }

        const q = query(collection(db, "messages"), ...constraints);
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => 
          convertTimestamps({ id: doc.id, ...doc.data() })
        );
      } catch (error) {
        console.error("Error finding messages:", error);
        return [];
      }
    },
  },

  directMessage: {
    async create(params: { data: any; include?: any }) {
      try {
        const now = Timestamp.now();
        const docRef = await addDoc(collection(db, "directMessages"), {
          ...params.data,
          deleted: false,
          createdAt: now,
          updatedAt: now,
        });
        
        const docSnap = await getDoc(docRef);
        const messageData = convertTimestamps({ id: docRef.id, ...docSnap.data() });
        
        // Handle includes
        if (params.include?.member) {
          const memberRef = doc(db, "members", params.data.memberId);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            messageData.member = convertTimestamps({ id: memberSnap.id, ...memberSnap.data() });
            
            if (params.include.member.include?.profile) {
              const profileRef = doc(db, "profiles", messageData.member.profileId);
              const profileSnap = await getDoc(profileRef);
              if (profileSnap.exists()) {
                messageData.member.profile = convertTimestamps({ 
                  id: profileSnap.id, 
                  ...profileSnap.data() 
                });
              }
            }
          }
        }
        
        return messageData;
      } catch (error) {
        console.error("Error creating direct message:", error);
        throw error;
      }
    },

    async update(params: {
      where: { id: string };
      data: any;
      include?: any;
    }) {
      try {
        const docRef = doc(db, "directMessages", params.where.id);
        await updateDoc(docRef, {
          ...params.data,
          updatedAt: Timestamp.now(),
        });
        
        const docSnap = await getDoc(docRef);
        const messageData = convertTimestamps({ id: docSnap.id, ...docSnap.data() });
        
        // Handle includes
        if (params.include?.member) {
          const memberRef = doc(db, "members", messageData.memberId);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            messageData.member = convertTimestamps({ id: memberSnap.id, ...memberSnap.data() });
            
            if (params.include.member.include?.profile) {
              const profileRef = doc(db, "profiles", messageData.member.profileId);
              const profileSnap = await getDoc(profileRef);
              if (profileSnap.exists()) {
                messageData.member.profile = convertTimestamps({ 
                  id: profileSnap.id, 
                  ...profileSnap.data() 
                });
              }
            }
          }
        }
        
        return messageData;
      } catch (error) {
        console.error("Error updating direct message:", error);
        throw error;
      }
    },

    async delete(params: { where: { id: string } }) {
      try {
        const docRef = doc(db, "directMessages", params.where.id);
        await deleteDoc(docRef);
        return { id: params.where.id };
      } catch (error) {
        console.error("Error deleting direct message:", error);
        throw error;
      }
    },

    async findMany(params: any) {
      try {
        const constraints: QueryConstraint[] = [];
        
        if (params.where?.conversationId) {
          constraints.push(where("conversationId", "==", params.where.conversationId));
        }
        
        if (params.orderBy) {
          const field = Object.keys(params.orderBy)[0];
          const direction = params.orderBy[field];
          constraints.push(orderBy(field, direction));
        }
        
        if (params.take) {
          constraints.push(limit(params.take));
        }

        const q = query(collection(db, "directMessages"), ...constraints);
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => 
          convertTimestamps({ id: doc.id, ...doc.data() })
        );
      } catch (error) {
        console.error("Error finding direct messages:", error);
        return [];
      }
    },
  },

  conversation: {
    async findFirst(params: any) {
      try {
        const constraints: QueryConstraint[] = [];
        
        if (params.where.id) {
          const docRef = doc(db, "conversations", params.where.id);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) return null;
          return convertTimestamps({ id: docSnap.id, ...docSnap.data() });
        }

        if (params.where.memberOneId && params.where.memberTwoId) {
          // Check both directions
          const q1 = query(
            collection(db, "conversations"),
            where("memberOneId", "==", params.where.memberOneId),
            where("memberTwoId", "==", params.where.memberTwoId),
            limit(1)
          );
          const snap1 = await getDocs(q1);
          if (!snap1.empty) {
            const doc = snap1.docs[0];
            return convertTimestamps({ id: doc.id, ...doc.data() });
          }
          
          const q2 = query(
            collection(db, "conversations"),
            where("memberOneId", "==", params.where.memberTwoId),
            where("memberTwoId", "==", params.where.memberOneId),
            limit(1)
          );
          const snap2 = await getDocs(q2);
          if (!snap2.empty) {
            const doc = snap2.docs[0];
            return convertTimestamps({ id: doc.id, ...doc.data() });
          }
        }

        return null;
      } catch (error) {
        console.error("Error finding conversation:", error);
        return null;
      }
    },

    async create(params: { data: any }) {
      try {
        const docRef = await addDoc(collection(db, "conversations"), params.data);
        const docSnap = await getDoc(docRef);
        return convertTimestamps({ id: docRef.id, ...docSnap.data() });
      } catch (error) {
        console.error("Error creating conversation:", error);
        throw error;
      }
    },
  },
};
