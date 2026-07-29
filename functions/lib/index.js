import { createHash, randomUUID } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ADMIN_EMAIL, bookEditableFields, normalizeBookInput, normalizeIdentity, validateBookInput, } from './bookSchema.js';
if (!getApps().length)
    initializeApp();
const db = getFirestore();
const region = 'asia-southeast1';
const callableOptions = { region, timeoutSeconds: 60, memory: '256MiB' };
function assertAdmin(request) {
    const token = request.auth?.token;
    const email = String(token?.email ?? '').toLocaleLowerCase('en-US');
    const provider = String(token?.firebase?.sign_in_provider ?? '');
    if (!request.auth || email !== ADMIN_EMAIL || token?.email_verified !== true || provider !== 'google.com') {
        throw new HttpsError('permission-denied', 'บัญชีนี้ไม่มีสิทธิ์จัดการคลังหนังสือ');
    }
    return { uid: request.auth.uid, email };
}
function requiredText(value, label) {
    const result = String(value ?? '').trim();
    if (!result)
        throw new HttpsError('invalid-argument', `ไม่พบ${label}`);
    return result;
}
function requestKey(uid, requestId) {
    const id = requiredText(requestId, ' requestId');
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(id))
        throw new HttpsError('invalid-argument', 'requestId ไม่ถูกต้อง');
    return `${uid}_${id}`;
}
function uniqueKeyFor(book) {
    return createHash('sha256')
        .update(`${normalizeIdentity(book.title)}\u0000${normalizeIdentity(book.author)}`)
        .digest('hex');
}
function auditRecord(action, bookId, admin, before, after) {
    return {
        action,
        bookId,
        actorUid: admin.uid,
        actorEmail: admin.email,
        before,
        after,
        createdAt: FieldValue.serverTimestamp(),
    };
}
async function mutateBook(request, action) {
    const admin = assertAdmin(request);
    const idempotencyRef = db.collection('adminRequests').doc(requestKey(admin.uid, request.data.requestId));
    const requestedBookId = action === 'create' ? '' : requiredText(request.data.bookId, ' bookId');
    const targetRef = action === 'create' ? db.collection('books').doc() : db.collection('books').doc(requestedBookId);
    return db.runTransaction(async (transaction) => {
        const previousRequest = await transaction.get(idempotencyRef);
        if (previousRequest.exists) {
            const previousData = previousRequest.data();
            if (previousData?.action !== action)
                throw new HttpsError('already-exists', 'requestId นี้ถูกใช้กับรายการอื่นแล้ว');
            return { bookId: String(previousData?.bookId), repeated: true };
        }
        const previousSnapshot = action === 'create' ? null : await transaction.get(targetRef);
        if (action !== 'create' && !previousSnapshot?.exists)
            throw new HttpsError('not-found', 'ไม่พบหนังสือที่ต้องการ');
        const previous = previousSnapshot?.data() ?? null;
        let next;
        if (action === 'create' || action === 'update') {
            const input = normalizeBookInput(request.data.book);
            const validationError = validateBookInput(input);
            if (validationError)
                throw new HttpsError('invalid-argument', validationError);
            next = {
                ...(previous ?? {}),
                ...Object.fromEntries(bookEditableFields.map((field) => [field, input[field]])),
                id: targetRef.id,
                normalizedTitle: normalizeIdentity(input.title),
                normalizedAuthor: normalizeIdentity(input.author),
                normalizedTitleAuthor: `${normalizeIdentity(input.title)}\u0000${normalizeIdentity(input.author)}`,
                createdAt: previous?.createdAt ?? FieldValue.serverTimestamp(),
                createdBy: previous?.createdBy ?? admin.uid,
                updatedAt: FieldValue.serverTimestamp(),
                updatedBy: admin.uid,
            };
        }
        else {
            next = {
                ...previous,
                active: action === 'restore',
                updatedAt: FieldValue.serverTimestamp(),
                updatedBy: admin.uid,
            };
        }
        const nextUniqueKey = uniqueKeyFor(next);
        const nextUniqueRef = db.collection('bookUniqueKeys').doc(nextUniqueKey);
        const previousUniqueKey = previous ? uniqueKeyFor(previous) : null;
        if (previousUniqueKey !== nextUniqueKey) {
            const existingUnique = await transaction.get(nextUniqueRef);
            if (existingUnique.exists && existingUnique.data()?.bookId !== targetRef.id) {
                throw new HttpsError('already-exists', 'มีหนังสือชื่อและผู้แต่งนี้อยู่แล้ว');
            }
        }
        transaction.set(targetRef, next);
        transaction.set(nextUniqueRef, {
            bookId: targetRef.id,
            normalizedTitle: next.normalizedTitle,
            normalizedAuthor: next.normalizedAuthor,
            updatedAt: FieldValue.serverTimestamp(),
        });
        if (previousUniqueKey && previousUniqueKey !== nextUniqueKey) {
            transaction.delete(db.collection('bookUniqueKeys').doc(previousUniqueKey));
        }
        transaction.create(db.collection('bookAuditLogs').doc(), auditRecord(action, targetRef.id, admin, previous, next));
        transaction.create(idempotencyRef, {
            action,
            bookId: targetRef.id,
            actorUid: admin.uid,
            createdAt: Timestamp.now(),
            expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        return { bookId: targetRef.id, repeated: false };
    });
}
export const createBook = onCall(callableOptions, (request) => mutateBook(request, 'create'));
export const updateBook = onCall(callableOptions, (request) => mutateBook(request, 'update'));
export const archiveBook = onCall(callableOptions, (request) => mutateBook(request, 'archive'));
export const restoreBook = onCall(callableOptions, (request) => mutateBook(request, 'restore'));
export const healthcheck = onCall(callableOptions, (request) => {
    const admin = assertAdmin(request);
    return { ok: true, projectId: process.env.GCLOUD_PROJECT ?? '', admin: admin.email, nonce: randomUUID() };
});
//# sourceMappingURL=index.js.map