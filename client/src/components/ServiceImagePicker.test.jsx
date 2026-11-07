// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, expect, test } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ServiceImagePicker from './ServiceImagePicker'

afterEach(cleanup)
function Editor() {
  const [image, setImage] = useState('')
  const [busy, setBusy] = useState(false)
  return <ServiceImagePicker value={image} onChange={setImage} onBusyChange={setBusy} disabled={busy} />
}
test('previews an uploaded image and restores the default when removed', async () => {
  render(<Editor />)
  const preview = screen.getByAltText('Service image preview')
  const original = preview.src
  fireEvent.change(screen.getByLabelText('Service image'), { target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] } })
  await waitFor(() => expect(preview.src).toMatch(/^data:image\/png;base64,/))
  fireEvent.click(screen.getByRole('button', { name: 'Remove image' }))
  expect(preview.src).toBe(original)
})
test('rejects unsupported uploads without replacing the preview', () => {
  render(<Editor />)
  const original = screen.getByAltText('Service image preview').src
  fireEvent.change(screen.getByLabelText('Service image'), { target: { files: [new File(['text'], 'file.txt', { type: 'text/plain' })] } })
  expect(screen.getByRole('alert').textContent).toContain('up to 2 MB')
  expect(screen.getByAltText('Service image preview').src).toBe(original)
})
