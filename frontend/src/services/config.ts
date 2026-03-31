export const config = {
  userPoolId: import.meta.env.VITE_USER_POOL_ID ?? "",
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID ?? "",
  uploadUrlEndpoint: import.meta.env.VITE_UPLOAD_URL_ENDPOINT ?? "",
  galleryEndpoint: import.meta.env.VITE_GALLERY_ENDPOINT ?? "",
  albumsEndpoint: import.meta.env.VITE_ALBUMS_ENDPOINT ?? "",
  cloudfrontDomain: import.meta.env.VITE_CLOUDFRONT_DOMAIN ?? "",
};
