type PersonLike = {
  name?: string | null;
  email?: string | null;
};

type ProjectLike = {
  title?: string | null;
  projectCode?: string | null;
};

function emailPrefix(email?: string | null) {
  if (!email) return "";
  return email.split("@")[0]?.trim() ?? "";
}

function displayPersonName(person?: PersonLike | null, fallback = "Customer") {
  const name = person?.name?.trim();
  if (name) return name;

  const emailName = emailPrefix(person?.email);
  if (emailName) return emailName;

  return fallback;
}

export function getConversationDisplayMeta(args: {
  project?: ProjectLike | null;
  customer?: PersonLike | null;
  otherParticipant?: PersonLike | null;
  isProjectConversation: boolean;
}) {
  const { project, customer, otherParticipant, isProjectConversation } = args;

  if (isProjectConversation) {
    const customerName = displayPersonName(customer, "Customer");
    const projectTitle = project?.title?.trim() || "Custom Outfit";

    return {
      title: `${customerName} • ${projectTitle}`,
      subtitle: project?.projectCode?.trim() || null,
    };
  }

  return {
    title: displayPersonName(otherParticipant, "Conversation"),
    subtitle: "Direct message",
  };
}