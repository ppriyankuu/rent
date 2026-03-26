"use client";

import { useState } from "react";
import { MessageSquare, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useComplaints } from "@/hooks/useComplaints";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils/date";

export default function ComplaintsPage() {
  const { complaints, loading, submitComplaint } = useComplaints();
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedSubject.length < 3) {
      return;
    }

    if (trimmedMessage.length < 10) {
      return;
    }

    setSubmitting(true);
    const success = await submitComplaint(trimmedSubject, trimmedMessage);
    if (success) {
      setSubject("");
      setMessage("");
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
      <PageHeader
        title="My Complaints"
        icon={MessageSquare}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> New Complaint
          </button>
        }
      />

      {complaints.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No complaints submitted yet"
        />
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow"
            >
              <div className="card-body p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold flex items-center gap-2">
                      {getStatusIcon(c.status)} {c.subject}
                    </h3>
                    <p className="text-sm text-base-content/60 mt-1">{c.message}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                {c.adminReply && (
                  <div className="mt-3 p-3 bg-base-200 rounded-lg">
                    <p className="text-xs font-semibold text-base-content/60 mb-1">
                      Admin Reply
                    </p>
                    <p className="text-sm">{c.adminReply}</p>
                  </div>
                )}
                <p className="text-xs text-base-content/40 mt-2">
                  Submitted {formatDate(c.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit a Complaint"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Subject</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g., Broken AC"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Message</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Describe the issue. Be specific and write it detailed."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
            />
          </div>
          <button
            type="submit"
            className={`btn btn-primary w-full ${submitting ? "btn-disabled" : ""}`}
            disabled={submitting || subject.trim().length < 3 || message.trim().length < 10}
          >
            {submitting && <span className="loading loading-spinner loading-sm"></span>}
            Submit Complaint
          </button>
        </form>
      </Modal>
    </div>
  );
}
