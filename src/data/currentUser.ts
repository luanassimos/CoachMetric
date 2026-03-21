import type { User, UserStudioAccess } from "@/lib/types";

export const currentUser: User = {
  id: "u1",
  first_name: "Luan",
  last_name: "Assimos",
  email: "coachassimos@gmail.com",
  role: "district_manager",
  status: "active",
};

export const userStudioAccess: UserStudioAccess[] = [
  {
    id: "usa1",
    user_id: "u1",
    studio_id: "nb",
    access_level: "manager",
    is_primary: true,
  },
  {
    id: "usa2",
    user_id: "u1",
    studio_id: "bg",
    access_level: "manager",
    is_primary: false,
  },
  {
    id: "usa3",
    user_id: "u1",
    studio_id: "cc",
    access_level: "manager",
    is_primary: false,
  },
  {
    id: "usa4",
    user_id: "u1",
    studio_id: "tb",
    access_level: "manager",
    is_primary: false,
  },
];