export interface Block {
  type: "p" | "h2" | "quote" | "list";
  text?: string;
  cite?: string;
  items?: string[];
}

export const HOME_META = {
  title: "হৈচৈ!",
  tagline: "শহরের হৈচৈ, সংবাদের ভাষায়",
  intro:
    "শহর ফিডে যা বলে, আমরা তা যাচাই করে লিখি। হৈচৈয়ের সম্পাদকীয় ডেস্কে প্রতিটি খবর ও পাঠকের মন্তব্যের জন্য আছে আলাদা পর্যালোচনা। নিচের লাইভ গ্রাফে দেখুন ডাটাবেসে কত প্রতিবেদন জমেছে, কোনটি প্রকাশিত, আর আলোচনায় কী যোগ হলো।",
  deskLine: "হৈচৈ ডেস্ক লঞ্চ",
  pipelineChain: "FEED → SHOT → HASH → LLM → GIT → DEPLOY",
};
