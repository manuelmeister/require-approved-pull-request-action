import {getInput, info, setFailed, warning} from '@actions/core';
import {context, getOctokit} from '@actions/github';

async function run() {
    if (context.eventName !== 'pull_request') {
        setFailed(`Invalid event: ${context.eventName}, it should be use on pull_request`);
        return;
    }

    const minimum_approvals = Number.parseInt(getInput("minimum_approvals"), 10);
    if (Number.isNaN(minimum_approvals) || minimum_approvals < 1) {
        setFailed(`Invalid input count of input.minimum_approvals`);
    }

    const kit = getOctokit(getInput('token'));
    const reviews = await kit.pulls.listReviews({
        ...context.repo,
        pull_number: context.payload.pull_request.number
    })

    const currentUserReviews = new Map<Number, string>();
    reviews.data.forEach((review) => {
        currentUserReviews.set(review.user.id, review.state);
    })
    const userReviewsStates = Array.from(currentUserReviews.values());

    if (userReviewsStates.includes('REQUEST_CHANGES')) {
        setFailed('Please implement the requested changes or dismiss the review');
        return;
    }

    if (userReviewsStates.includes('PENDING')) {
        warning('Warning: There are pending reviews');
    }

    const number_of_approvals = userReviewsStates.filter((status) => status === 'APPROVED').length;
    if (number_of_approvals >= minimum_approvals) {
        info(`This Pull Request has enough approvals to be merged`);
    } else {
        setFailed(`This Pull Request need at least '${minimum_approvals}' approval(s)`);
    }
}

try {
    run()
} catch (e) {
    setFailed(`Exception: ${e}`);
}
