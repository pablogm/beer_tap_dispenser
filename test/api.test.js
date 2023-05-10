const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const messages = require('../constants/messages');
const { PRICE_PER_LITRE } = require('../constants/constants');

const { expect } = chai;
chai.use(chaiHttp);

describe('API Routes', () => {
    describe('POST /api/dispenser', () => {
        it('should create a new dispenser and return the created dispenser id and flow_volume', (done) => {
            chai
                .request(app)
                .post('/api/dispenser')
                .send({ flow_volume: 1.5 })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('id');
                    expect(res.body).to.have.property('flow_volume');
                    expect(res.body.flow_volume).to.equal(1.5);
                    done();
                });
        });

        it('should return an error when flow_volume is not provided', (done) => {
            chai
                .request(app)
                .post('/api/dispenser')
                .send({})
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.equal('Flow volume is required');
                    done();
                });
        });

        it('should return an error when flow_volume is not a number', (done) => {
            chai
                .request(app)
                .post('/api/dispenser')
                .send({ flow_volume: 'invalid' })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.equal('Flow volume must be a number');
                    done();
                });
        });

        it('should return an error when flow_volume is a negative number', (done) => {
            chai
                .request(app)
                .post('/api/dispenser')
                .send({ flow_volume: -1.5 })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.equal('Flow volume must be a positive number');
                    done();
                });
        });
    });

    describe('PUT /dispenser/:id/status', () => {
        let dispenserId;

        beforeEach(async () => {
            // Create a dispenser before running tests
            const response = await chai.request(app).post('/api/dispenser').send({ flow_volume: 2.5 });
            dispenserId = response.body.id;
        });

        it('should change the dispenser status and return 202', async () => {
            return chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'open', updated_at: new Date().toISOString() })
                .then((res) => {
                    expect(res).to.have.status(202);
                });
        });

        it('should return 400 if status or updated_at is missing', async () => {
            return chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'close' })
                .then((res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.error).to.equal(messages.STATUS_UPDATED_AT_FIELDS_REQUIRED);
                });
        });

        it('should return 404 if dispenser is not found', async () => {
            return chai
                .request(app)
                .put('/api/dispenser/nonexistent_id/status')
                .send({ status: 'close', updated_at: new Date().toISOString() })
                .then((res) => {
                    expect(res).to.have.status(404);
                    expect(res.body.error).to.equal(messages.DISPENSER_NOT_FOUND);
                });
        });

        it('should return 409 if dispenser is already in the desired status', async () => {
            // First, change the dispenser status to close
            await chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'close', updated_at: new Date().toISOString() });

            // Try to change the status to close again
            return chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'close', updated_at: new Date().toISOString() })
                .then((res) => {
                    expect(res).to.have.status(409);
                    expect(res.body.message).to.equal(messages.DISPENSER_ALREADY_IN_DESIRED_STATE);
                });
        });

        it('should return 400 if an invalid status is provided', async () => {
            let response = await chai.request(app).post('/api/dispenser').send({ flow_volume: 2.5 });
            const dispenserId = response.body.id;

            return chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'INVALID_STATUS', updated_at: new Date().toISOString() })
                .then((res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.error).to.equal(messages.INVALID_DISPENSER_STATUS);
                });
        });

        it('should return 400 if an invalid date format is provided', async () => {
            let response = await chai.request(app).post('/api/dispenser').send({ flow_volume: 2.5 });
            const dispenserId = response.body.id;

            await chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'open', updated_at: new Date().toISOString() });

            return chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'close', updated_at: 'invalid_date' })
                .then((res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.error).to.equal(messages.INVALID_DATE_FORMAT);
                });
        });
    });

    describe('GET /dispenser/:id/spending', () => {
        let dispenserId;

        beforeEach(async () => {
            // Create a dispenser and change its status before running tests
            let response = await chai.request(app).post('/api/dispenser').send({ flow_volume: 2.5 });
            dispenserId = response.body.id;

            await chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'open', updated_at: new Date().toISOString() });
        });

        it('should return the dispenser spending and return 200', async () => {
            return chai
                .request(app)
                .get(`/api/dispenser/${dispenserId}/spending`)
                .then((res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.usages).to.be.an('array');
                    expect(res.body.usages[0].opened_at).to.exist;
                    expect(res.body.usages[0].flow_volume).to.exist;
                });
        });

        it('should return 404 if dispenser is not found', async () => {
            return chai
                .request(app)
                .get('/api/dispenser/nonexistent_id/spending')
                .then((res) => {
                    expect(res).to.have.status(404);
                    expect(res.body.error).to.equal(messages.DISPENSER_NOT_FOUND);
                });
        });

        it('should return an empty array if dispenser has no spending data', async () => {
            let response = await chai.request(app).post('/api/dispenser').send({ flow_volume: 2.5 });
            const dispenserId = response.body.id;

            return chai
                .request(app)
                .get(`/api/dispenser/${dispenserId}/spending`)
                .then((res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.usages).to.be.an('array').that.is.empty;
                });
        });

        it('should return multiple spending entries if dispenser status has been changed multiple times', async () => {
            let response = await chai.request(app).post('/api/dispenser').send({ flow_volume: 2.5 });
            const dispenserId = response.body.id;

            await chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'open', updated_at: new Date().toISOString() });

            await chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'close', updated_at: new Date().toISOString() });

            return chai
                .request(app)
                .get(`/api/dispenser/${dispenserId}/spending`)
                .then((res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.usages).to.be.an('array').with.lengthOf(1);
                    expect(res.body.usages[0].opened_at).to.exist;
                    expect(res.body.usages[0].closed_at).to.exist;
                    expect(res.body.usages[0].flow_volume).to.exist;
                });
        });

        it('should calculate total_spent when status is changed to close', async () => {
            let response = await chai.request(app).post('/api/dispenser').send({ flow_volume: 2.5 });
            const dispenserId = response.body.id;
            const openDate = new Date();

            await chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'open', updated_at: openDate.toISOString() });

            const closeDate = new Date(openDate.getTime() + 10000); // 10 seconds later

            await chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'close', updated_at: closeDate.toISOString() });

            return chai
                .request(app)
                .get(`/api/dispenser/${dispenserId}/spending`)
                .then((res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.usages).to.be.an('array').with.lengthOf(1);
                    expect(res.body.usages[0].total_spent).to.be.closeTo(2.5 * 10 * PRICE_PER_LITRE, 0.2); // flow_volume * time open in seconds * price per litre
                });
        });

        it('should calculate total_spent for currently open dispenser', async () => {
            let response = await chai.request(app).post('/api/dispenser').send({ flow_volume: 2.5 });
            const dispenserId = response.body.id;
            const openDate = new Date();

            await chai
                .request(app)
                .put(`/api/dispenser/${dispenserId}/status`)
                .send({ status: 'open', updated_at: openDate.toISOString() });

            await new Promise((resolve) => setTimeout(resolve, 5000)); // wait for 5 seconds

            return chai
                .request(app)
                .get(`/api/dispenser/${dispenserId}/spending`)
                .then((res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.usages).to.be.an('array').with.lengthOf(1);
                    const totalSpent = (new Date() - new Date(openDate)) / 1000 * 2.5 * PRICE_PER_LITRE;
                    expect(res.body.usages[0].total_spent).to.be.closeTo(totalSpent, 0.2); // allow for a small error due to timing
                });
        }).timeout(10000); // Increase timeout for this test to 10 seconds;
    });
});