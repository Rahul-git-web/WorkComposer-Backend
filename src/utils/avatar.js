export const getAvatarUrl = (avatar) => {
  if (!avatar) return null;

  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }

  return `http://localhost:5000/${avatar}`;
};