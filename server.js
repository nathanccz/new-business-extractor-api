import { PdfReader } from 'pdfreader'
import express from 'express'
import cors from 'cors'
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())

// Config
const BUSINESS_ID_REGEX = /^\d{10}-\d{4}-\d$/ // Matches IDs like "1234567890-1234-5"
const DEFAULT_FIELDS = [
  'businessName',
  'startDate',
  'address',
  'city',
  'zipCode',
]

/**
 * Extracts structured business data from a PDF file.
 * @param {string} filePath - Path to the PDF file.
 * @returns {Promise<Array<Object>>} - Array of business entries.
 */
async function extractBusinessData(filePath) {
  return new Promise((resolve, reject) => {
    const businesses = []
    let currentFields = [...DEFAULT_FIELDS],
      isNewBusiness = false,
      currentBusiness = {}

    const reader = new PdfReader()

    reader.parseFileItems(filePath, (err, item) => {
      if (err) return reject(new Error(`PDF parsing failed: ${err.message}`))
      if (!item) {
        if (currentBusiness.id) {
          businesses.push(currentBusiness)
        } //If there's a non-empty value in currentBusiness at the end of loop, push to businesses array
        return resolve(businesses)
      }

      if (!item.text || item.text.trim() === '') return // Skip empty items

      if (item.text) {
        const textParts = item.text.split(' ')
        processTextParts(textParts)
      }
    })

    function processTextParts(parts) {
      if (isNewBusiness && currentFields.length > 0) {
        currentBusiness[currentFields[0]] = formatField(parts.join(' '))
        currentFields.shift()
      } else if (currentFields.length === 0) {
        businesses.push(currentBusiness)
        currentBusiness = {}
        currentFields = [...DEFAULT_FIELDS] // Reset fields
        isNewBusiness = false
      }

      if (BUSINESS_ID_REGEX.test(parts[0])) {
        isNewBusiness = true
        currentBusiness.id = parts[0]
      }
    }
  })
}

function formatField(value) {
  return value.trim()
}

function paginateBusinesses(businesses, page) {
  const startIndex = (page - 1) * 50
  const endIndex = startIndex + 50
  return businesses.slice(startIndex, endIndex)
}

app.get('/api/businesses/', async (req, res) => {
  try {
    const businesses = await extractBusinessData('may-2025.pdf')
    res.json({ data: businesses, total: businesses.length })
  } catch (error) {
    console.error('🔥 Error:', error.message)
    res.status(500).json({ error: 'Failed to extract business data.' })
  }
})

// API Endpoint
app.get('/api/businesses/:page', async (req, res) => {
  const { page } = req.params
  console.log(`Received request for page: ${page}`)
  try {
    const businesses = await extractBusinessData('may-2025.pdf')
    const result = paginateBusinesses(businesses, parseInt(page))
    console.log(businesses[0], businesses[businesses.length - 1])

    res.json({ data: result, total: businesses.length })
  } catch (error) {
    console.error('🔥 Error:', error.message)
    res.status(500).json({ error: 'Failed to extract business data.' })
  }
})

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}.`)
})
