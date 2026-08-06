# Cloudinary image storage

VIMS uses the backend as the only trusted upload boundary for the web app and
the Android/iOS app. Configure either `CLOUDINARY_URL`, or all three of
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` on
the backend host. Never expose the API secret in either client.

New uploads are organized under `vims/profiles`, `vims/vehicles`, `vims/ids`,
`vims/verification-selfies`, `vims/receipts`, `vims/announcements`, and
`vims/service-requests`.

Before migrating legacy local/database-backed images, back up MongoDB and the
backend `uploads` directory. Preview the migration first:

```sh
npm run images:migrate:check
```

After reviewing the candidate and missing-file counts, apply it once:

```sh
npm run images:migrate
```

The apply command uploads available legacy images, stores each Cloudinary URL
and public ID, and clears successfully migrated verification image buffers.
It does not delete local files; remove those only after manually verifying the
Cloudinary assets and taking a backup.
