import { AntiSpamIcon } from '@automattic/jetpack-components';
import { store as coreStore } from '@wordpress/core-data';
import { __, sprintf } from '@wordpress/i18n';
import { seen, trash, backup } from '@wordpress/icons';
import { store as noticesStore } from '@wordpress/notices';
import { notSpam, spam } from '../../../icons';
import { STORE_NAME } from '../../../state';
import { ACTIONS } from '../../constants';
import InboxResponse from '../../response';

export const viewAction = {
	id: 'view-response',
	label: __( 'View response', 'jetpack-forms' ),
	isPrimary: true,
	icon: seen,
	RenderModal: ( { items } ) => {
		const [ item ] = items;
		return <InboxResponse isLoading={ false } response={ item } />;
	},
};

export const markAsSpamAction = {
	id: 'mark-as-spam',
	label: __( 'Mark as spam', 'jetpack-forms' ),
	isEligible: item => item.status !== 'spam',
	supportsBulk: true,
	icon: spam,
	async callback( items, { registry } ) {
		const itemIds = items.map( ( { id } ) => id );
		const { createSuccessNotice, createErrorNotice } = registry.dispatch( noticesStore );
		try {
			await registry.dispatch( STORE_NAME ).doBulkAction( itemIds, ACTIONS.markAsSpam );
			const numberOfItems = itemIds.length;
			const successMessage =
				numberOfItems === 1
					? sprintf(
							/* translators: The number of responses. */
							__( '%d response has been marked as spam.', 'jetpack-forms' ),
							numberOfItems
					  )
					: sprintf(
							/* translators: The number of responses. */
							__( '%d responses have been marked as spam.', 'jetpack-forms' ),
							numberOfItems
					  );
			createSuccessNotice( successMessage, { type: 'snackbar', id: 'mark-as-spam-action' } );
		} catch {
			createErrorNotice(
				__( 'An error occurred while marking responses as spam.', 'jetpack-forms' ),
				{ type: 'snackbar' }
			);
		}
	},
};

export const markAsNotSpamAction = {
	id: 'mark-as-not-spam',
	label: __( 'Not spam', 'jetpack-forms' ),
	isEligible: item => item.status === 'spam',
	supportsBulk: true,
	icon: notSpam,
	async callback( items, { registry } ) {
		const itemIds = items.map( ( { id } ) => id );
		const { createSuccessNotice, createErrorNotice } = registry.dispatch( noticesStore );
		try {
			await registry.dispatch( STORE_NAME ).doBulkAction( itemIds, ACTIONS.markAsNotSpam );
			const numberOfItems = itemIds.length;
			const successMessage =
				numberOfItems === 1
					? sprintf(
							/* translators: The number of responses. */
							__( '%d response has been marked as not spam.', 'jetpack-forms' ),
							numberOfItems
					  )
					: sprintf(
							/* translators: The number of responses. */
							__( '%d responses have been marked as not spam.', 'jetpack-forms' ),
							numberOfItems
					  );
			createSuccessNotice( successMessage, { type: 'snackbar', id: 'mark-as-not-spam-action' } );
		} catch {
			createErrorNotice(
				__( 'An error occurred while marking responses as not spam.', 'jetpack-forms' ),
				{ type: 'snackbar' }
			);
		}
	},
};

// TODO: should there be a check whether Akismet is enabled?
// TODO: also current implementation seems to check for every response and not the selected ones..
// TODO: shouldn't we use the Akismet REST API? Can we?
export const checkForSpamAction = {
	id: 'check-for-spam',
	label: __( 'Check for spam', 'jetpack-forms' ),
	isEligible: item => [ 'draft', 'publish' ].includes( item.status ),
	supportsBulk: true,
	icon: AntiSpamIcon,
	RenderModal: () => {
		// TODO: why this happens with ajax (`checkForSpam` function) and not with REST API?
		// Investigate how to do this better?
		return <p>This does not work right now..</p>;
	},
};

// /**
//  * Custom temporary handler for check-for-spam action based on grunion_check_for_spam.
//  *
//  * @param {number} offset - Offset for the query.
//  * @return {Promise} Promise that resolves once checking for spam has finished.
//  */
// const checkForSpam = ( offset = 0 ) => {
// 	const limit = 100;
// 	const body = new FormData();

// 	body.append( 'action', 'grunion_recheck_queue' );
// 	body.append(
// 		`jetpack_check_feedback_spam_${ config( 'blogId' ) }`,
// 		config( 'checkForSpamNonce' )
// 	);
// 	body.append( 'offset', offset );
// 	body.append( 'limit', limit );

// 	return fetch( window.ajaxurl, { method: 'POST', body } )
// 		.then( response => response.json() )
// 		.then( data => {
// 			if ( data.processed < limit ) {
// 				return;
// 			}

// 			return checkForSpam( offset + limit );
// 		} );
// };

export const restoreAction = {
	id: 'restore',
	label: __( 'Restore', 'jetpack-forms' ),
	isEligible: item => item.status === 'trash',
	supportsBulk: true,
	icon: backup,
	async callback( items, { registry } ) {
		const { saveEntityRecord } = registry.dispatch( coreStore );
		const { createSuccessNotice, createErrorNotice } = registry.dispatch( noticesStore );
		const promises = await Promise.allSettled(
			items.map( ( { id } ) =>
				saveEntityRecord( 'postType', 'feedback', { id, status: 'publish' } )
			)
		);
		if ( promises.every( ( { status } ) => status === 'fulfilled' ) ) {
			const numberOfItems = promises.length;
			const successMessage =
				numberOfItems === 1
					? /* translators: The number of responses. */
					  sprintf( __( '%d response has been restored.', 'jetpack-forms' ), numberOfItems )
					: sprintf(
							/* translators: The number of responses. */
							__( '%d responses have been restored.', 'jetpack-forms' ),
							numberOfItems
					  );
			createSuccessNotice( successMessage, { type: 'snackbar', id: 'restore-action' } );
			return;
		}
		// There is at least one failure.
		const numberOfErrors = promises.filter( ( { status } ) => status === 'rejected' ).length;
		// TODO: probably have better error messages..
		const errorMessage =
			numberOfErrors === 1
				? /* translators: The number of responses. */
				  sprintf( __( 'An error occurred for %d response.', 'jetpack-forms' ), numberOfErrors )
				: sprintf(
						/* translators: The number of responses. */
						__( 'An error occurred for %d responses.', 'jetpack-forms' ),
						numberOfErrors
				  );
		createErrorNotice( errorMessage, { type: 'snackbar' } );
	},
};

export const moveToTrashAction = {
	id: 'move-to-trash',
	label: __( 'Move to trash', 'jetpack-forms' ),
	isEligible: item => item.status !== 'trash',
	supportsBulk: true,
	icon: trash,
	async callback( items, { registry } ) {
		const { deleteEntityRecord } = registry.dispatch( coreStore );
		const { createSuccessNotice, createErrorNotice } = registry.dispatch( noticesStore );
		const promises = await Promise.allSettled(
			items.map( ( { id } ) =>
				deleteEntityRecord( 'postType', 'feedback', id, {}, { throwOnError: true } )
			)
		);
		if ( promises.every( ( { status } ) => status === 'fulfilled' ) ) {
			const numberOfItems = promises.length;
			const successMessage =
				numberOfItems === 1
					? /* translators: The number of responses. */
					  sprintf( __( '%d response has been moved to trash.', 'jetpack-forms' ), numberOfItems )
					: sprintf(
							/* translators: The number of responses. */
							__( '%d responses have been moved to trash.', 'jetpack-forms' ),
							numberOfItems
					  );
			createSuccessNotice( successMessage, { type: 'snackbar', id: 'move-to-trash-action' } );
			return;
		}
		// There is at least one failure.
		const numberOfErrors = promises.filter( ( { status } ) => status === 'rejected' ).length;
		// TODO: probably have better error messages..
		const errorMessage =
			numberOfErrors === 1
				? /* translators: The number of responses. */
				  sprintf( __( 'An error occurred for %d response.', 'jetpack-forms' ), numberOfErrors )
				: sprintf(
						/* translators: The number of responses. */
						__( 'An error occurred for %d responses.', 'jetpack-forms' ),
						numberOfErrors
				  );
		createErrorNotice( errorMessage, { type: 'snackbar' } );
	},
};

export const deleteAction = {
	id: 'delete',
	label: __( 'Delete Permanently', 'jetpack-forms' ),
	isEligible: item => item.status === 'trash',
	supportsBulk: true,
	icon: trash,
	async callback( items, { registry } ) {
		const { deleteEntityRecord } = registry.dispatch( coreStore );
		const { createSuccessNotice, createErrorNotice } = registry.dispatch( noticesStore );
		const promises = await Promise.allSettled(
			items.map( ( { id } ) =>
				deleteEntityRecord( 'postType', 'feedback', id, { force: true }, { throwOnError: true } )
			)
		);
		if ( promises.every( ( { status } ) => status === 'fulfilled' ) ) {
			const numberOfItems = promises.length;
			const successMessage =
				numberOfItems === 1
					? sprintf(
							/* translators: The number of responses. */
							__( '%d response has been deleted permanently.', 'jetpack-forms' ),
							numberOfItems
					  )
					: sprintf(
							/* translators: The number of responses. */
							__( '%d responses have been deleted permanently.', 'jetpack-forms' ),
							numberOfItems
					  );
			createSuccessNotice( successMessage, { type: 'snackbar', id: 'move-to-trash-action' } );
			return;
		}
		// There is at least one failure.
		const numberOfErrors = promises.filter( ( { status } ) => status === 'rejected' ).length;
		// TODO: probably have better error messages..
		const errorMessage =
			numberOfErrors === 1
				? /* translators: The number of responses. */
				  sprintf( __( 'An error occurred for %d response.', 'jetpack-forms' ), numberOfErrors )
				: sprintf(
						/* translators: The number of responses. */
						__( 'An error occurred for %d responses.', 'jetpack-forms' ),
						numberOfErrors
				  );
		createErrorNotice( errorMessage, { type: 'snackbar' } );
	},
};
