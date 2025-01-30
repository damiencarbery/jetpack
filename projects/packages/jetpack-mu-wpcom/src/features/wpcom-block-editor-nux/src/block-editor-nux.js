import { LocaleProvider } from '@automattic/i18n-utils';
import { Guide, GuidePage } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { registerPlugin } from '@wordpress/plugins';
import { getQueryArg } from '@wordpress/url';
import { useCanvasMode } from '../../../common/hooks';
import {
	HasSeenSellerCelebrationModalProvider,
	HasSeenVideoCelebrationModalProvider,
	ShouldShowFirstPostPublishedModalProvider,
} from '../../../common/tour-kit';
import DraftPostModal from './draft-post-modal';
import FirstPostPublishedModal from './first-post-published-modal';
import PurchaseNotice from './purchase-notice';
import RecommendedTagsModal from './recommended-tags-modal';
import SellerCelebrationModal from './seller-celebration-modal';
import { DEFAULT_VARIANT } from './store';
import VideoPressCelebrationModal from './video-celebration-modal';
import WpcomNux from './welcome-modal/wpcom-nux';
import LaunchWpcomWelcomeTour from './welcome-tour/tour-launch';

/**
 * The WelcomeTour component
 * @return {JSX.Element|null} The WelcomeTour component or null.
 */
function WelcomeTour() {
	const [ showDraftPostModal ] = useState(
		getQueryArg( window.location.href, 'showDraftPostModal' )
	);

	const { show, isLoaded, variant } = useSelect( select => {
		const welcomeGuideStoreSelect = select( 'automattic/wpcom-welcome-guide' );

		return {
			show: welcomeGuideStoreSelect.isWelcomeGuideShown(),
			isLoaded: welcomeGuideStoreSelect.isWelcomeGuideStatusLoaded(),
			variant: welcomeGuideStoreSelect.getWelcomeGuideVariant(),
		};
	}, [] );

	const siteEditorCanvasMode = useCanvasMode();

	const { fetchWelcomeGuideStatus } = useDispatch( 'automattic/wpcom-welcome-guide' );

	// On mount check if the WPCOM welcome guide status exists in state (from local storage), otherwise fetch it from the API.
	useEffect( () => {
		if ( ! isLoaded ) {
			fetchWelcomeGuideStatus();
		}
	}, [ fetchWelcomeGuideStatus, isLoaded ] );

	const filteredShow = applyFilters( 'a8c.WpcomBlockEditorWelcomeTour.show', show );

	if ( ! filteredShow ) {
		return null;
	}

	// Hide the Welcome Tour when not in the edit mode. Note that canvas mode is available only in the site editor
	if ( siteEditorCanvasMode && siteEditorCanvasMode !== 'edit' ) {
		return null;
	}

	if ( variant === DEFAULT_VARIANT ) {
		return (
			<LocaleProvider>
				{ showDraftPostModal ? <DraftPostModal /> : <LaunchWpcomWelcomeTour /> }
			</LocaleProvider>
		);
	}

	// This case is redundant now and it will be cleaned up in a follow-up PR
	if ( variant === 'modal' && Guide && GuidePage ) {
		return <WpcomNux />;
	}

	return null;
}

registerPlugin( 'wpcom-block-editor-nux', {
	render: () => (
		<HasSeenSellerCelebrationModalProvider>
			<HasSeenVideoCelebrationModalProvider>
				<ShouldShowFirstPostPublishedModalProvider>
					<WelcomeTour />
					<FirstPostPublishedModal />
					<RecommendedTagsModal />
					<SellerCelebrationModal />
					<PurchaseNotice />
					<VideoPressCelebrationModal />
				</ShouldShowFirstPostPublishedModalProvider>
			</HasSeenVideoCelebrationModalProvider>
		</HasSeenSellerCelebrationModalProvider>
	),
} );
