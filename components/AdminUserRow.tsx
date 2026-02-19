"use client";

import { useState } from "react";
import type { UserRow } from "@/types";

type TrainerOption = {
  userId: string;
  name: string;
};

type Props = {
  user: UserRow;
  trainers: TrainerOption[];
};

export function AdminUserRow({ user, trainers }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="rounded-xl border border-emerald-100 p-3">
      {!editing ? (
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <p className="text-xs text-zinc-500">Name</p>
            <p className="break-words text-sm">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Role</p>
            <p className="text-sm">{user.role}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Mobile</p>
            <p className="break-all text-sm">{user.mobile}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Status</p>
            <p className="text-sm">{user.allowlistFlag}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Assigned Trainer</p>
            <p className="text-sm">
              {user.role === "user"
                ? trainers.find((t) => t.userId === user.trainerId)?.name || "unassigned"
                : "Not applicable"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <form action="/api/admin/users" method="post">
              <input type="hidden" name="action" value="setStatus" />
              <input type="hidden" name="userId" value={user.userId} />
              <button
                className={
                  user.allowlistFlag === "enabled"
                    ? "btn btn-danger"
                    : "btn btn-secondary"
                }
                type="submit"
                name="allowlistFlag"
                value={user.allowlistFlag === "enabled" ? "disabled" : "enabled"}
              >
                {user.allowlistFlag === "enabled" ? "Disable" : "Enable"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <form action="/api/admin/users" method="post" className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <input type="hidden" name="action" value="update" />
            <input type="hidden" name="userId" value={user.userId} />
            <div>
              <label className="text-xs text-zinc-500">Name</label>
              <input name="name" defaultValue={user.name} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Role</p>
              <p className="text-sm">{user.role}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-500">Mobile</label>
              <input name="mobile" defaultValue={user.mobile} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Status</p>
              <p className="text-sm">{user.allowlistFlag}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-500">Assigned Trainer</label>
              {user.role === "user" ? (
                <select name="trainerId" defaultValue={user.trainerId || ""}>
                  <option value="">unassigned</option>
                  {trainers.map((t) => (
                    <option value={t.userId} key={t.userId}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-zinc-500">Not applicable</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
              <button className="btn btn-secondary" type="submit">
                Save
              </button>
              <button
                type="button"
                className="btn btn-muted"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setConfirmDelete(true)}
              >
                Delete Permanently
              </button>
            </div>
          </form>

          {confirmDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-sm rounded-xl border border-red-200 bg-white p-4 shadow-xl">
                <h4 className="text-base font-semibold text-zinc-900">Delete Account Permanently?</h4>
                <p className="mt-2 text-sm text-zinc-600">
                  This will permanently remove <span className="font-medium">{user.name}</span> and related data.
                </p>
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn btn-muted"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                  <form action="/api/admin/users" method="post">
                    <input type="hidden" name="action" value="delete" />
                    <input type="hidden" name="userId" value={user.userId} />
                    <button type="submit" className="btn bg-red-700 text-white hover:bg-red-800">
                      Delete Permanently
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
