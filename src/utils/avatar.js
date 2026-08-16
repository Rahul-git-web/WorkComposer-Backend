export const getAvatarUrl = (avatar) => {
  if (!avatar) return null;

  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }

   return `${process.env.BACKEND_URL}/${avatar}`;
};