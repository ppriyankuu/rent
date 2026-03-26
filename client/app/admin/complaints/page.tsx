"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useAdminComplaints } from "@/hooks/useComplaints";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils/date";
import type { Complaint } from "@/lib/types";

export default function AdminComplaintsPage() {
  const { complaints, loading, updateComplaint } = useAdminComplaints();
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [replyStatus, setReplyStatus] = useState("open");
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openReply = (c: Complaint) => {
    setSelected(c);
    setReplyStatus(c.status);
    setReplyText(c.adminReply || "");
    setModalOpen(true);
  };

  const handleReply = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    const success = await updateComplaint(selected.id, replyStatus, replyText);
    if (success) {
      setModalOpen(false);
    }
    setSubmitting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-info" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return null;
    }
  };

  if (loading) return <LoadingSpinner text="Loading complaints..." />;

  return (
    <div>
      <PageHeader title="Complaints" icon={MessageSquare} />

      {complaints.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No complaints yet"
        />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="card bg-base-100 shadow-sm border border-base-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openReply(c)}
            >
              <div className="card-body p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold flex items-center gap-2">
                      {getStatusIcon(c.status)} {c.subject}
                    </h3>
                    <p className="text-sm text-base-content/60 mt-1">{c.message}</p>
                    <p className="text-xs text-base-content/40 mt-2">
                      By {c.tenantName} ({c.tenantEmail}) • {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                {c.adminReply && (
                  <div className="mt-2 p-2 bg-base-200 rounded text-sm">
                    <strong>Your reply:</strong> {c.adminReply}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Reply to Complaint">
        {selected && (
          <form onSubmit={handleReply} className="space-y-4">
            <div className="p-3 bg-base-200 rounded text-sm">
              <p className="font-bold">{selected.subject}</p>
              <p className="mt-1">{selected.message}</p>
              <p className="text-xs text-base-content/50 mt-2">From: {selected.tenantName}</p>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Status</span></label>
              <select
                className="select select-bordered w-full"
                value={replyStatus}
                onChange={(e) => setReplyStatus(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Admin Reply</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder="Type your reply..."
              />
            </div>
            <button
              type="submit"
              className={`btn btn-primary w-full ${submitting ? "btn-disabled" : ""}`}
              disabled={submitting}
            >
              {submitting && <span className="loading loading-spinner loading-sm"></span>}
              Update Complaint
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}

// Import icons
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";
