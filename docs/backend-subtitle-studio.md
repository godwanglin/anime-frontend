# Backend Subtitle Studio

Repo ini hanya berisi frontend/admin/player. Implementasi backend berikut ditujukan untuk service Node.js yang sudah melayani `http://localhost:3000/api`.

## Prisma Schema

```prisma
enum SubtitleFormat {
  vtt
  srt
}

model Episode {
  id        Int        @id @default(autoincrement())
  subtitles Subtitle[]
}

model Subtitle {
  id        Int            @id @default(autoincrement())
  episodeId Int
  serverUrl String
  language  String
  label     String
  fileUrl   String
  format    SubtitleFormat @default(vtt)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  episode   Episode        @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@unique([episodeId, serverUrl, language])
  @@index([episodeId, serverUrl])
}
```

Migration notes: normalize `language` to lowercase, store `serverUrl` as the original server `value`, not proxied player URL.

## Service

```ts
import path from 'node:path';
import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const allowed = new Set(['srt', 'vtt']);

function normalizeLang(language: string) {
	return language.trim().toLowerCase();
}

function detectFormat(nameOrUrl = '', content = '') {
	const ext = path.extname(nameOrUrl).slice(1).toLowerCase();
	if (allowed.has(ext)) return ext as 'srt' | 'vtt';
	return content.trimStart().startsWith('WEBVTT') ? 'vtt' : 'srt';
}

export function srtToVtt(input: string) {
	const body = input
		.replace(/^\uFEFF/, '')
		.replace(/\r+/g, '')
		.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
		.trim();
	return body.startsWith('WEBVTT') ? body : `WEBVTT\n\n${body}\n`;
}

async function storeSubtitleFile(file: Express.Multer.File) {
	const raw = await fs.readFile(file.path, 'utf8');
	const format = detectFormat(file.originalname, raw);
	if (!allowed.has(format))
		throw Object.assign(new Error('Format subtitle tidak valid'), { status: 400 });
	const content = format === 'srt' ? srtToVtt(raw) : raw;
	if (!content.includes('-->'))
		throw Object.assign(new Error('File subtitle tidak valid'), { status: 400 });
	const fileName = `${Date.now()}-${file.originalname.replace(/\.(srt|vtt)$/i, '')}.vtt`;
	const outputPath = path.join(process.cwd(), 'public', 'uploads', 'subtitles', fileName);
	await fs.mkdir(path.dirname(outputPath), { recursive: true });
	await fs.writeFile(outputPath, content);
	return { fileUrl: `/uploads/subtitles/${fileName}`, format: 'vtt' as const };
}

export async function listSubtitles(episodeId: number) {
	return prisma.subtitle.findMany({
		where: { episodeId },
		orderBy: [{ serverUrl: 'asc' }, { language: 'asc' }]
	});
}

export async function createSubtitle(body: any, file?: Express.Multer.File) {
	const episodeId = Number(body.episodeId);
	const language = normalizeLang(body.language);
	if (!episodeId || !body.serverUrl || !language || !body.label) {
		throw Object.assign(new Error('Field subtitle belum lengkap'), { status: 400 });
	}
	const stored = file
		? await storeSubtitleFile(file)
		: { fileUrl: String(body.fileUrl || ''), format: detectFormat(body.fileUrl) };
	if (!stored.fileUrl)
		throw Object.assign(new Error('File atau URL subtitle wajib diisi'), { status: 400 });

	return prisma.subtitle
		.create({
			data: { episodeId, serverUrl: body.serverUrl, language, label: body.label.trim(), ...stored }
		})
		.catch((error) => {
			if (error.code === 'P2002')
				throw Object.assign(new Error('Subtitle bahasa ini sudah ada di server tersebut'), {
					status: 409
				});
			throw error;
		});
}

export async function updateSubtitle(id: number, body: any) {
	const data: any = {};
	if (body.language) data.language = normalizeLang(body.language);
	if (body.label) data.label = body.label.trim();
	if (body.fileUrl) {
		data.fileUrl = body.fileUrl.trim();
		data.format = detectFormat(body.fileUrl);
	}
	return prisma.subtitle.update({ where: { id }, data });
}

export async function deleteSubtitle(id: number) {
	return prisma.subtitle.delete({ where: { id } });
}

export async function importSubtitle(body: any) {
	const episodeId = Number(body.episodeId);
	const language = normalizeLang(body.language);
	const source = await prisma.subtitle.findUnique({
		where: { episodeId_serverUrl_language: { episodeId, serverUrl: body.fromServerUrl, language } }
	});
	if (!source) throw Object.assign(new Error('Subtitle sumber tidak ditemukan'), { status: 404 });
	return prisma.subtitle.create({
		data: {
			episodeId,
			serverUrl: body.toServerUrl,
			language,
			label: source.label,
			fileUrl: source.fileUrl,
			format: source.format
		}
	});
}
```

## Routes

```ts
import { Router } from 'express';
import multer from 'multer';
import * as service from './subtitle.service';

const upload = multer({ dest: 'tmp/subtitles', limits: { fileSize: 5 * 1024 * 1024 } });
export const subtitleRoutes = Router();

function send(fn: any) {
	return async (req, res, next) => {
		try {
			const data = await fn(req);
			res.json({ status: 200, message: null, errorCode: null, data });
		} catch (error) {
			next(error);
		}
	};
}

subtitleRoutes.get(
	'/subtitles',
	send((req) => service.listSubtitles(Number(req.query.episodeId)))
);
subtitleRoutes.post(
	'/subtitles',
	upload.single('file'),
	send((req) => service.createSubtitle(req.body, req.file))
);
subtitleRoutes.put(
	'/subtitles/:id',
	send((req) => service.updateSubtitle(Number(req.params.id), req.body))
);
subtitleRoutes.delete(
	'/subtitles/:id',
	send((req) => service.deleteSubtitle(Number(req.params.id)))
);
subtitleRoutes.post(
	'/subtitles/import',
	send((req) => service.importSubtitle(req.body))
);
```

Mount for admin and public as needed:

```ts
app.use('/api/admin', requireAdmin, subtitleRoutes);
app.use('/api', subtitleRoutes);
```

Episode detail response should include subtitles:

```ts
const episode = await prisma.episode.findUnique({
	where: { id },
	include: { servers: true, subtitles: true }
});
```

The frontend expects each subtitle item to contain `serverUrl`, `language`, `label`, `fileUrl`, and optional `format`.
