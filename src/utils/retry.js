module.exports = async (

  fn,

  {
    retries = Number(
      process.env.COURIER_RETRY_COUNT || 3
    ),

    delay = Number(
      process.env.COURIER_RETRY_DELAY || 1000
    ),

    factor = Number(
      process.env.COURIER_RETRY_FACTOR || 2
    )

  } = {}

) => {

  let currentRetry = 0;

  while (currentRetry <= retries) {

    try {

      return await fn();

    } catch (err) {

      currentRetry++;

      const status = err.response?.status;

      const retryable =

        !status ||

        [500, 502, 503, 504]
          .includes(status);

      if (
        currentRetry > retries ||
        !retryable
      ) {
        throw err;
      }

      const waitTime =
        delay * Math.pow(
          factor,
          currentRetry - 1
        );

      await new Promise((resolve) =>
        setTimeout(resolve, waitTime)
      );
    }
  }
};
