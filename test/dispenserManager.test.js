const assert = require('chai').assert;
const { expect } = require('chai');
const { DispenserManager, DispenserState } = require('../managers/dispenserManager');
const messages = require('../constants/messages');
const constants = require('../constants/constants');

describe('DispenserManager', () => {
    describe('createDispenser', () => {
        it('should create a dispenser and add it to the dispensers array', () => {
            const dispenserManager = new DispenserManager();
            const flowVolume = 1;

            const dispenser = dispenserManager.createDispenser(flowVolume);

            assert.equal(dispenser.flow_volume, flowVolume);
            assert.equal(dispenser.state, DispenserState.CLOSE);
            assert.instanceOf(dispenser.updated_at, Date);

            assert.equal(dispenserManager.dispensers[dispenserManager.dispensers.length - 1], dispenser);
        });

        it('should throw an error when flow volume is invalid', function () {
            const dispenserManager = new DispenserManager();

            expect(() => dispenserManager.createDispenser(-1)).to.throw(Error, 'Flow volume should be a positive number.');
            expect(() => dispenserManager.createDispenser(0)).to.throw(Error, 'Flow volume should be a positive number.');
            expect(() => dispenserManager.createDispenser('abc')).to.throw(Error, 'Flow volume should be a positive number.');
        });
    });

    describe('changeDispenserStatus', () => {
        let dispenserManager;
        let dispenser;

        beforeEach(() => {
            dispenserManager = new DispenserManager();
            dispenser = dispenserManager.createDispenser(0.5);
        });

        it('should throw an error for invalid dispenser state', () => {
            expect(() => dispenserManager.changeDispenserStatus(dispenser.id, 'INVALID', new Date()))
                .to.throw(messages.INVALID_DISPenser_STATUS);
        });

        it('should return false when trying to set the state to the current state', () => {
            const result = dispenserManager.changeDispenserStatus(dispenser.id, DispenserState.CLOSE, new Date());
            expect(result).to.deep.equal({ success: false, message: messages.DISPENSER_ALREADY_IN_DESIRED_STATE });
        });

        it('should set the state to OPEN', () => {
            const result = dispenserManager.changeDispenserStatus(dispenser.id, DispenserState.OPEN, new Date());
            expect(result).to.deep.equal({ success: true, dispenser: { ...dispenser, state: DispenserState.OPEN } });
        });

        it('should set the state to CLOSE and calculate the total spent', (done) => {
            const openDate = new Date();
            const closeDate = new Date(openDate.getTime() + 1000 * 60); // 1 minute later
            dispenserManager.changeDispenserStatus(dispenser.id, DispenserState.OPEN, openDate);
            const result = dispenserManager.changeDispenserStatus(dispenser.id, DispenserState.CLOSE, closeDate);
            expect(result).to.deep.equal({
                success: true,
                dispenser: { ...dispenser, state: DispenserState.CLOSE, updated_at: closeDate },
            });
            const totalSpent = dispenserManager.totalSpentPerDispenser.get(dispenser.id);
            expect(totalSpent).to.be.closeTo(60 * 0.5 * constants.PRICE_PER_LITRE, 0.01);
            done();
        });

        it('should throw an error if updatedAt is less than opened_at when closing', function () {
            const dispenserManager = new DispenserManager();
            const dispenser = dispenserManager.createDispenser(10);
            dispenserManager.changeDispenserStatus(dispenser.id, DispenserState.OPEN, new Date('2023-05-11T00:00:00Z'));

            expect(() => {
                dispenserManager.changeDispenserStatus(dispenser.id, DispenserState.CLOSE, new Date('2023-05-10T23:59:59Z'));
            }).to.throw(messages.INVALID_DATE_ORDER);
        });

        it('should throw an error if updatedAt is less than closed_at when opening', function () {
            const dispenserManager = new DispenserManager();
            const dispenser = dispenserManager.createDispenser(10);
            dispenserManager.changeDispenserStatus(dispenser.id, DispenserState.OPEN, new Date('2023-05-11T00:00:00Z'));
            dispenserManager.changeDispenserStatus(dispenser.id, DispenserState.CLOSE, new Date('2023-05-11T01:00:00Z'));

            expect(() => {
                dispenserManager.changeDispenserStatus(dispenser.id, DispenserState.OPEN, new Date('2023-05-11T00:59:59Z'));
            }).to.throw(messages.INVALID_DATE_ORDER);
        });
    });

    describe('getSpending', () => {
        let dispenserManager;
        let dispenser;

        beforeEach(() => {
            dispenserManager = new DispenserManager();
            dispenser = dispenserManager.createDispenser(0.5);
        });

        it('should throw an error for a dispenser that does not exist', () => {
            expect(() => dispenserManager.getSpending('non-existent-id')).to.throw(messages.DISPENSER_NOT_FOUND);
        });

        it('should return an empty array for a new dispenser', () => {
            const spending = dispenserManager.getSpending(dispenser.id);
            expect(spending).to.deep.equal({ amount: 0, usages: [] });
        });

        it('should return the spending for a dispenser', (done) => {
            const openDate = new Date();
            const closeDate = new Date(openDate.getTime() + 1000 * 60); // 1 minute later
            dispenserManager.changeDispenserStatus(dispenser.id, DispenserState.OPEN, openDate);
            dispenserManager.changeDispenserStatus(dispenser.id, DispenserState.CLOSE, closeDate);
            const spending = dispenserManager.getSpending(dispenser.id);
            expect(spending.amount).to.be.closeTo(60 * 0.5 * constants.PRICE_PER_LITRE, 0.01);
            expect(spending.usages.length).to.equal(1);
            expect(spending.usages[0].total_spent).to.be.closeTo(60 * 0.5 * constants.PRICE_PER_LITRE, 0.01);
            done();
        });
    });
});
