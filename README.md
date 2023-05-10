# Beer Dispenser API

This project is an API for managing beer dispensers. It allows you to create dispensers, change their status, and track the spending based on beer flow.

## Installation

1. Clone the repository: `git clone https://github.com/pablogm/beer_tap_disperser.git`
2. Install dependencies: `npm install`
3. Start the server: `npm start`

## API Endpoints

### GET `/`

Returns a message confirming that the API is working.

### POST `/dispenser`

Creates a new dispenser.

**Request body:**
- `flow_volume`: The flow volume of the dispenser (required)

**Response:**
- `id`: The unique ID of the created dispenser
- `flow_volume`: The flow volume of the dispenser

### PUT `/dispenser/:id/status`

Changes the status of a dispenser.

**Request parameters:**
- `id`: The ID of the dispenser (required)

**Request body:**
- `status`: The new status of the dispenser (required)
- `updated_at`: The timestamp when the status was updated (required)

**Response:**
202 status code and an empty body if the status of the tap changed correctly.

### GET `/dispenser/:id/spending`

Gets the spending of a dispenser.

**Request parameters:**
- `id`: The ID of the dispenser (required)

**Response:**
- `amount`: The total amount spent by the dispenser
- `usages`: A list of usage records, each with `opened_at`, `closed_at`, `flow_volume`, and `total_spent`

## Testing

Run tests with `npm test`.

## Error Handling

Errors are returned as JSON in the following format:

```json
{
  "error": "error message"
}
```

## Improvements

### Error Logging:
At the moment we are handling the errors but not logging them. We should eventually use a logging library to log errors, which is very helpful for debugging and tracing issues in production. Also we could use a middleware for error handling in our Express application.

### Environment Variables:
Any configuration values or sensitive information (like database connection strings, API keys, etc.) should be moved to environment variables rather than being hardcoded.

### Code Linting and Formatting:
We could use tools like ESLint for linting and Prettier for formatting to keep the code consistent and catch common mistakes.

### Continuous Integration/Continuous Deployment (CI/CD): 
We should set up CI/CD which would automatically run our tests and automatically deploy the code to the different environtments (development, stating, production).

### Security: 
We need to handle security aspects, such as rate limiting, CORS, data validation, etc. to protect the application from common web vulnerabilities.

### Performance and Scaling: 
We need to consider performance optimizations, such as caching, and think about how the application would scale if the number of users or requests increased dramatically.

### Metrics and KPIs
Another very important aspect is to collect metrics and KPIs which will allow us to measure performance, identify issues and opportunities, take decissions, set goals and detect trends.

### Costs
Cost control and efficiency are critical factors in any project. It allow us to manage budget, optimize resources, make accurate financial forecasts, increase profitabilty and provide confidence amongst stakeholders.

### Database
We would want our data to be persistent, which would involve setting up a database, creating a data model, and modifying the code to read/write from the database.


## Final thoughts 

This kind of API is a clear candidate to be implemented in a serverless fashion using one of the 3 big cloud providers (AWS, Azure, GC). It would greatly benefit from their services allowing us to scale quickly and seamesly, balance traffic, have a granular control of expenses, access monitoring and logging tools, collect metrics and KPIs, setup a CI/CD pipeline, use a DNS service and CDN, use their catching solutions along with their persistent databases (in this case I would use a NoSQL db).
