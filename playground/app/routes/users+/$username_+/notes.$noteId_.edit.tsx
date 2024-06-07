import { type DataFunctionArgs, json, redirect } from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { db, updateNote } from '#app/utils/db.server.ts'
import { invariantResponse, useIsSubmitting } from '#app/utils/misc.tsx'

export async function loader({ params }: DataFunctionArgs) {
	const note = db.note.findFirst({
		where: {
			id: {
				equals: params.noteId,
			},
		},
	})
	if (!note) {
		throw new Response('Note not found', { status: 404 })
	}
	return json({
		note: { title: note.title, content: note.content },
	})
}

type ActionErrors = {
	formErrors: Array<string>
	fieldErrors: {
		title: Array<string>
		content: Array<string>
	}
}

const titleMaxLength = 100
const contentMaxLength = 10000

export async function action({ request, params }: DataFunctionArgs) {
	invariantResponse(params.noteId, 'noteId param is required')

	const formData = await request.formData()
	const title = formData.get('title')
	const content = formData.get('content')
	invariantResponse(typeof title === 'string', 'title must be a string')
	invariantResponse(typeof content === 'string', 'content must be a string')

	// 🐨 create an errors object here
	const errors: ActionErrors = {
		formErrors: [],
		fieldErrors: {
			title: [],
			content: [],
		},
	}

	// 🐨 validate the requirements for the title and content and add any errors
	// to the errors object
	if (!title) {
		errors.fieldErrors.title.push('Title is required')
	}
	if (title.length > titleMaxLength) {
		errors.fieldErrors.title.push(
			`Title should contain no more than ${titleMaxLength} characters`,
		)
	}
	if (!content) {
		errors.fieldErrors.content.push('Content is required')
	}
	if (content.length > contentMaxLength) {
		errors.fieldErrors.content.push(
			`Content should contain no more than ${contentMaxLength} characters`,
		)
	}
	// dummy form validation error
	const firstTitleWord = title.split(' ')[0].toLowerCase()
	if (!content.toLowerCase().includes(firstTitleWord)) {
		errors.formErrors.push(`Content should include the word ${firstTitleWord}`)
	}
	// 🐨 if there are any errors, then return a json response with the errors
	// and a 400 status code
	const hasErrors =
		errors.formErrors.length ||
		Object.values(errors.fieldErrors).some(fieldErrors => fieldErrors.length)

	if (hasErrors) {
		return json(
			{
				status: 'error',
				errors,
			} as const,
			{ status: 400 },
		)
	}

	await updateNote({ id: params.noteId, title, content })

	return redirect(`/users/${params.username}/notes/${params.noteId}`)
}

// 🐨 this is a good place to stick the ErrorList component if you want to use that
function ErrorList({ errors }: { errors: Array<string> }) {
	return errors?.length ? (
		<ul>
			{errors.map((e, i) => (
				<li key={i} className="text-[10px] text-foreground-destructive">
					{e}
				</li>
			))}
		</ul>
	) : null
}

export default function NoteEdit() {
	const data = useLoaderData<typeof loader>()
	// 🐨 get the actionData from useActionData here
	const actionData = useActionData<typeof action>()
	const isSubmitting = useIsSubmitting()
	const formId = 'note-editor'

	// 🐨 get the fieldErrors here from the actionData
	const fieldErrors =
		actionData?.status === 'error'
			? (actionData.errors as ActionErrors)?.fieldErrors
			: null ?? { title: [], content: [] }
	// 🐨 get the fieldErrors here from the actionData
	const formErrors =
		actionData?.status === 'error'
			? (actionData.errors as ActionErrors)?.formErrors
			: null ?? []

	return (
		<div className="absolute inset-0">
			<Form
				id={formId}
				// 🐨 to test out the server-side validation, you need to disable the
				// client-side validation. You can do that by adding:
				noValidate
				method="post"
				className="flex h-full flex-col gap-y-4 overflow-y-auto overflow-x-hidden px-10 pb-28 pt-12"
			>
				<div className="flex flex-col gap-1">
					<div>
						{/* 🦉 NOTE: this is not an accessible label, we'll get to that in the accessibility exercises */}
						<Label>Title</Label>
						<Input
							name="title"
							defaultValue={data.note.title}
							required
							maxLength={titleMaxLength}
						/>
						{/* 🐨 add the title error messages here */}
						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList errors={fieldErrors?.title} />
						</div>
					</div>
					<div>
						{/* 🦉 NOTE: this is not an accessible label, we'll get to that in the accessibility exercises */}
						<Label>Content</Label>
						<Textarea
							name="content"
							defaultValue={data.note.content}
							required
							maxLength={contentMaxLength}
						/>
						{/* 🐨 add the content error messages here */}
						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList errors={fieldErrors?.content} />
						</div>
					</div>
				</div>
				{/* 🐨 add the form error messages here */}
				<div className="min-h-[32px] px-4 pb-3 pt-1">
					<ErrorList errors={formErrors} />
				</div>
				{/*
				🦉 even though we don't really have form messages, we're going to
				have you do it anyway so you can see how it works and to maintain
				consistency with the codebase.

				💯 If you've got extra time, think of an error you could have that would
				be at the form level (like, maybe your content must include a word from
				the title or something like that)
			*/}
			</Form>
			<div className={floatingToolbarClassName}>
				<Button variant="destructive" type="reset">
					{/* 🦉 NOTE: this button doesn't work right now, we'll get to that in the accessibility exercise */}
					Reset
				</Button>
				<StatusButton
					form={formId}
					type="submit"
					disabled={isSubmitting}
					status={isSubmitting ? 'pending' : 'idle'}
				>
					Submit
				</StatusButton>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No note with the id "{params.noteId}" exists</p>
				),
			}}
		/>
	)
}
